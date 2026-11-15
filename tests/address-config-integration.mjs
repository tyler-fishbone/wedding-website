import assert from 'node:assert/strict';import {randomUUID}from'node:crypto';import{loadEnvFile}from'node:process';
loadEnvFile('.env.local');
const origin=process.env.ADDRESS_TEST_ORIGIN||'http://127.0.0.1:3101';const adminOrigin=process.env.RSVP_TEST_ORIGIN||'http://127.0.0.1:3100';
const id='10000000-0000-4000-8000-000000000001';
const original=(await(await fetch(process.env.SUPABASE_URL+'/rest/v1/households?id=eq.'+id,{headers:{apikey:process.env.SUPABASE_SECRET_KEY}})).json())[0];
try{
 const r=await fetch(origin+'/api/address',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({submissionId:randomUUID(),firstName1:'Alex',lastName1:'Example',firstName2:'',lastName2:'',email:'alex@example.com',phone:'5125550100',address1:'1 Independent Test Road',address2:'',city:'Austin',state:'TX',zip:'78701',countryCode:'US',fortuneCookieHope:'',submittedAt:'',userAgent:'config-test',pageUrl:'',referrer:''})});
 assert.equal(r.status,200,'Address storage must work without RSVP_SESSION_SECRET');
}finally{
 const login=await fetch(adminOrigin+'/api/admin',{method:'POST',headers:{Origin:adminOrigin,'Content-Type':'application/json'},body:JSON.stringify({passphrase:process.env.RSVP_ADMIN_PASSPHRASE})});
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const fields=['display_name','contact_email','phone','address_line_1','address_line_2','city','region','postal_code','country_code','mailing_status','grouping_needs_review'];
 const restored=await fetch(adminOrigin+'/api/admin',{method:'PATCH',headers:{Origin:adminOrigin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({kind:'household',id,...Object.fromEntries(fields.map(field=>[field,original[field]]))})});assert.equal(restored.status,200);
}
console.log('PASS: address persistence works without RSVP session configuration; fictional household restored.');
