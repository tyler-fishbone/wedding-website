import assert from 'node:assert/strict';
import test from 'node:test';
import {validateAddressPayload} from '../app/lib/address.ts';
const valid={submissionId:'40000000-0000-4000-8000-000000000001',firstName1:' Alex ',lastName1:'Example',firstName2:'',lastName2:'',email:'Alex@example.com',phone:'512-555-0100',address1:'123 Example St',address2:'',city:'Austin',state:'TX',zip:'78701',countryCode:'US',fortuneCookieHope:'A happy wedding',submittedAt:'2026-10-18T12:00:00Z',userAgent:'test',pageUrl:'http://localhost/save-the-date',referrer:''};
test('address payload trims values while preserving household names and the fortune-cookie answer',()=>{
 const result=validateAddressPayload(valid);
 assert.equal(result.firstName1,'Alex');assert.equal(result.email,'alex@example.com');assert.equal(result.countryCode,'US');assert.equal(result.fortuneCookieHope,'A happy wedding');
});
test('malformed address submissions are rejected before persistence',()=>{
 for(const value of [null,[],{...valid,email:'bad'},{...valid,phone:25},{...valid,submissionId:'bad'},{...valid,firstName1:''},{...valid,zip:''},{...valid,countryCode:'XX'},{...valid,firstName2:'Sam',lastName2:''},{...valid,fortuneCookieHope:'x'.repeat(2001)},{...valid,householdId:'arbitrary'}])assert.throws(()=>validateAddressPayload(value));
});
test('international addresses do not require US-specific state or ZIP fields',()=>{
 const result=validateAddressPayload({...valid,countryCode:'NL',state:'',zip:'1012 AB'});assert.equal(result.countryCode,'NL');assert.equal(result.state,'');assert.equal(result.zip,'1012 AB');
 assert.doesNotThrow(()=>validateAddressPayload({...valid,countryCode:'HK',state:'',zip:''}));
});

test('local international phone numbers may be shorter than US numbers',()=>{
 assert.doesNotThrow(()=>validateAddressPayload({...valid,countryCode:'HK',phone:'21234567',state:'',zip:''}));
 assert.throws(()=>validateAddressPayload({...valid,countryCode:'US',phone:'21234567'}));
});
