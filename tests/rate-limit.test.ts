import assert from 'node:assert/strict';import test from'node:test';import{requestRateKey}from'../app/lib/rsvp.ts';
test('rate keys hide visitor addresses and keep login and lookup budgets separate',()=>{
 const r=new Request('https://example.com',{headers:{'x-forwarded-for':'203.0.113.4'}}),secret='a-private-secret-over-thirty-two-characters';
 const lookup=requestRateKey(r,'lookup',secret);assert.match(lookup,/^lookup:[a-f0-9]{64}$/);assert.equal(lookup.includes('203.0.113.4'),false);assert.notEqual(lookup,requestRateKey(r,'admin',secret));assert.equal(lookup,requestRateKey(r,'lookup',secret));assert.throws(()=>requestRateKey(r,'lookup',''));
});
