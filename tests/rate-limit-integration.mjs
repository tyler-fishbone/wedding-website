import assert from'node:assert/strict';import{randomUUID,randomBytes}from'node:crypto';import{loadEnvFile}from'node:process';loadEnvFile('.env.local');
const headers={apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
const bucket='test:'+randomUUID();
const results=await Promise.all(Array.from({length:5},async()=>{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/rpc/consume_request_limit',{method:'POST',headers,body:JSON.stringify({p_bucket:bucket,p_limit:2,p_window_seconds:86400})});assert.equal(r.status,200);return r.json();}));
assert.equal(results.filter(Boolean).length,2,'Concurrent requests must share one atomic budget');
const origin=process.env.RSVP_TEST_ORIGIN||'http://127.0.0.1:3100';const testIp='2001:db8::'+randomBytes(2).toString('hex');
for(let attempt=0;attempt<11;attempt++){
 const r=await fetch(origin+'/api/admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-forwarded-for':testIp},body:JSON.stringify({passphrase:'deliberately-wrong-for-rate-test'})});assert.equal(r.status,attempt<10?401:429);
}
console.log('PASS: atomic shared request budgets and HTTP 429 on repeated admin-login attempts.');
