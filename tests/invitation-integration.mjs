import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
const origin=process.env.RSVP_TEST_ORIGIN||'http://127.0.0.1:3100';
const alex='20000000-0000-4000-8000-000000000001',sam='20000000-0000-4000-8000-000000000002';
const wedding='30000000-0000-4000-8000-000000000001',welcome='30000000-0000-4000-8000-000000000002';
let adminCookie='',guestCookie='';
async function api(path,method,body,cookie=''){
 const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function setInvite(guestId,eventId,active,cookie=adminCookie){return api('/api/admin','PATCH',{kind:'set-invitation',guestId,eventId,active},cookie);}
const headers={apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
async function db(path,body){const response=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {ok:response.ok,body:await response.json()};}
const login=await api('/api/admin','POST',{passphrase:process.env.RSVP_ADMIN_PASSPHRASE});assert.equal(login.status,200);adminCookie=login.cookie;
assert.equal((await setInvite(alex,welcome,false,'')).status,401);
const lookup=await api('/api/rsvp','POST',{action:'lookup',mode:'name',query:'Alex Example'});
const confirmed=await api('/api/rsvp','POST',{action:'confirm',token:lookup.body.matches[0].token});assert.equal(confirmed.status,200);guestCookie=confirmed.cookie;
const originalView=confirmed.body.household;
assert.equal(originalView.events.length,2,'Apply fictional fixture before running this test');
const originalAnswers=originalView.events.flatMap(event=>event.guests.map(guest=>({guestId:guest.id,eventId:event.id,attendance:guest.attendance??'attending'})));
const before=(await db(`rsvp_responses?guest_id=eq.${alex}&event_id=eq.${welcome}&select=attendance,responded_at`)).body;
let changed=false;
try{
 assert.equal((await setInvite(alex,welcome,false)).status,200,'Admin must support removing an invitation');changed=true;
 assert.equal((await api('/api/rsvp','GET',null,guestCookie)).body.household.events.length,1);
 assert.deepEqual((await db(`rsvp_responses?guest_id=eq.${alex}&event_id=eq.${welcome}&select=attendance,responded_at`)).body,before,'Removal preserves saved answer');
 assert.equal((await api('/api/rsvp','POST',{action:'save',responses:originalAnswers},guestCookie)).status,400,'Stale forms reject removed invitations');
 assert.equal((await db('rpc/save_household_rsvp',{p_household_id:originalView.id,p_responses:originalAnswers})).ok,false,'Database rejects inactive invitations');
 assert.equal((await setInvite(alex,welcome,true)).status,200);
 assert.equal((await api('/api/rsvp','GET',null,guestCookie)).body.household.events.length,2);
 assert.deepEqual((await db(`rsvp_responses?guest_id=eq.${alex}&event_id=eq.${welcome}&select=attendance,responded_at`)).body,before,'Reinviting preserves answer and timestamp');
 assert.equal((await setInvite(sam,welcome,true)).status,200);
 const added=await api('/api/rsvp','GET',null,guestCookie);
 assert.equal(added.body.household.events.find(event=>event.id===welcome).guests.find(guest=>guest.id===sam).attendance,null,'New invitation starts unanswered');
 for(const [guestId,eventId]of [[sam,welcome],[alex,welcome],[alex,wedding],[sam,wedding]])assert.equal((await setInvite(guestId,eventId,false)).status,200);
 assert.equal((await api('/api/rsvp','POST',{action:'lookup',mode:'name',query:'Alex Example'})).body.matches.length,0,'No active invitations means no lookup match');
 assert.equal((await setInvite(alex,'30000000-0000-4000-8000-000000000099',true)).status,404);
 assert.equal((await setInvite('20000000-0000-4000-8000-000000000099',wedding,true)).status,404);
 assert.equal((await api('/api/admin','PATCH',{kind:'set-invitation',guestId:alex,eventId:welcome,active:'false'},adminCookie)).status,400);
}finally{
 if(changed){for(const [guestId,eventId,active]of [[alex,welcome,true],[alex,wedding,true],[sam,wedding,true],[sam,welcome,false]])assert.equal((await setInvite(guestId,eventId,active)).status,200,'Restore fictional fixture invitations');}
}
console.log('PASS: admin-only add/remove, answer preservation, inactive-event hiding, stale-form rejection, database enforcement, empty lookup and fixture restoration.');
