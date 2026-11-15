import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
const base=process.env.RSVP_TEST_ORIGIN||'http://127.0.0.1:3100';
const household1='10000000-0000-4000-8000-000000000001',household2='10000000-0000-4000-8000-000000000002';
const jordan='20000000-0000-4000-8000-000000000003';
const dbBase=process.env.SUPABASE_URL+'/rest/v1/';
const headers={apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
async function db(path,body){const r=await fetch(dbBase+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
async function api(path,method,body,cookie=''){
 const r=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
const login=await api('/api/admin','POST',{passphrase:process.env.RSVP_ADMIN_PASSPHRASE});assert.equal(login.status,200);const cookie=login.cookie;
const patch=body=>api('/api/admin','PATCH',body,cookie);
const before=(await db(`households?id=in.(${household1},${household2})`)).body;assert.equal(before.length,2,'Install the deterministic fictional fixture first');
const guestCount=(await db('guests?select=id')).body.length;
const payload=(overrides={})=>({submissionId:randomUUID(),firstName1:'Alex',lastName1:'Example',firstName2:'Sam',lastName2:'Example',email:'address-test@example.com',phone:'5125550100',address1:'123 Fictional Test Road',address2:'Unit 4',city:'Austin',state:'TX',zip:'78701',countryCode:'US',fortuneCookieHope:'Keep our test cookies fortunate.',submittedAt:'2026-10-18T12:00:00Z',userAgent:'address-integration',pageUrl:base+'/save-the-date',referrer:'',...overrides});
const submitted=[];
async function submit(p,direct=false){submitted.push(p.submissionId);return direct?db('rpc/save_address_submission',{p_submission_id:p.submissionId,p_payload:p}):api('/api/address','POST',p);}
async function record(id){return (await db(`address_submissions?id=eq.${id}`)).body[0];}
async function household(id){return (await db(`households?id=eq.${id}`)).body[0];}
try{
 const p=payload();const saved=await submit(p,true);assert.equal(saved.status,200,'Supabase must persist address submissions');
 assert.equal(saved.body.status,'applied');assert.equal((await household(household1)).address_line_1,'123 Fictional Test Road');
 const first=await record(p.submissionId);assert.equal(first.payload.fortuneCookieHope,p.fortuneCookieHope);
 assert.equal((await submit({...p,submittedAt:new Date().toISOString()})).status,200);
 assert.equal((await record(p.submissionId)).applied_at,first.applied_at,'Retry must not apply twice');
 assert.equal((await db(`address_submissions?id=eq.${p.submissionId}`)).body.length,1);
 assert.equal((await patch({kind:'household',id:household1,mailing_status:'on_hold'})).status,200);
 const international=payload({countryCode:'NL',state:'',zip:'1012 AB',city:'Amsterdam',address1:'12 Fictional Canal'});
 assert.equal((await submit(international)).status,200);
 const held=await household(household1);assert.equal(held.country_code,'NL');assert.equal(held.region,null);assert.equal(held.mailing_status,'on_hold');
 const conflict=payload({firstName2:'',lastName2:'',email:'jordan@example.com',address1:'999 Must Not Be Applied'});
 assert.equal((await submit(conflict)).status,200);assert.equal((await record(conflict.submissionId)).status,'pending');
 assert.equal((await household(household1)).address_line_1,'12 Fictional Canal');
 assert.equal((await household(household2)).address_line_1,before.find(h=>h.id===household2).address_line_1);
 const unknown=payload({firstName1:'Unlisted',lastName1:'AddressExample',firstName2:'',lastName2:'',email:'unknown-address@example.com'});
 assert.equal((await submit(unknown)).status,200);assert.equal((await record(unknown.submissionId)).status,'pending');
 assert.equal((await patch({kind:'guest',id:jordan,display_name:'Alex Example'})).status,200);
 const ambiguous=payload({firstName2:'',lastName2:'',email:'ambiguous-address@example.com'});
 assert.equal((await submit(ambiguous)).status,200);assert.equal((await record(ambiguous.submissionId)).status,'pending');
 assert.equal((await patch({kind:'guest',id:jordan,display_name:'Jordan Sample'})).status,200);
 const overview=await api('/api/admin','GET',null,cookie);assert.equal(overview.status,200);assert.ok(overview.body.overview.addressSubmissions.some(s=>s.id===unknown.submissionId));
 assert.equal((await api('/api/admin','PATCH',{kind:'apply-address',submissionId:unknown.submissionId,householdId:household1})).status,401);
 assert.equal((await patch({kind:'apply-address',submissionId:unknown.submissionId,householdId:household1})).status,200);
 assert.equal((await record(unknown.submissionId)).status,'applied');assert.equal((await household(household1)).mailing_status,'on_hold');
 const appliedAt=(await record(unknown.submissionId)).applied_at;
 assert.equal((await patch({kind:'apply-address',submissionId:unknown.submissionId,householdId:household1})).status,200);
 assert.equal((await record(unknown.submissionId)).applied_at,appliedAt);
 assert.equal((await patch({kind:'apply-address',submissionId:unknown.submissionId,householdId:household2})).status,409);
 assert.equal((await api('/api/address','POST',payload({householdId:household2}))).status,400,'Public clients cannot choose a household ID');
 assert.equal((await api('/api/address','POST',payload({email:'invalid'}))).status,400);
 const cross=await fetch(base+'/api/address',{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:JSON.stringify(payload())});assert.equal(cross.status,403);
 assert.equal((await db('guests?select=id')).body.length,guestCount,'Address collection must not create guest-list entries');
}finally{
 // Complete test-only pending records, then restore the exact fictional mailing fields.
 for(const id of new Set(submitted)){
  const result=await db(`address_submissions?id=eq.${id}`);
  if(result.status===200&&result.body[0]?.status==='pending')assert.equal((await patch({kind:'apply-address',submissionId:id,householdId:household1})).status,200);
 }
 assert.equal((await patch({kind:'guest',id:jordan,display_name:'Jordan Sample'})).status,200);
 const fields=['display_name','contact_email','phone','address_line_1','address_line_2','city','region','postal_code','country_code','mailing_status','grouping_needs_review'];
 for(const original of before)assert.equal((await patch({kind:'household',id:original.id,...Object.fromEntries(fields.map(field=>[field,original[field]]))})).status,200);
}
console.log('PASS: address persistence, exact household matching, idempotent retry, international addresses, preserved holds, conflicts and ambiguity, private review, no guest creation, and fixture restoration.');
