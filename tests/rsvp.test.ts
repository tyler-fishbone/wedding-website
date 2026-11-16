import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLookup, issueToken, verifyToken, validateResponses, buildHouseholdView, checkOrigin, validateNameCorrection } from '../app/lib/rsvp.ts';
const secret = 'test-only-secret-with-at-least-thirty-two-characters';
const householdId = '10000000-0000-4000-8000-000000000001';
const guestId = '20000000-0000-4000-8000-000000000001';
const eventId = '30000000-0000-4000-8000-000000000001';
const invitation = {guest_id:guestId,event_id:eventId};
const answer = {guestId,eventId,attendance:'attending'};

test('lookup normalizes names and email without accepting broad wildcard searches', () => {
 assert.equal(normalizeLookup('  Alex   EXAMPLE ', 'name'), 'alex example');
 assert.equal(normalizeLookup(' Alex@Example.COM ', 'email'), 'alex@example.com');
 for (const value of ['', ' ', '*', '%', 'a'.repeat(201)]) assert.throws(()=>normalizeLookup(value,'name'));
 assert.throws(()=>normalizeLookup('alex','email'));
 assert.throws(()=>normalizeLookup({},'name'));
});
test('confirmation tokens cannot be changed into another household or used as sessions', () => {
 const token = issueToken(householdId,'choice',secret,1000,600);
 assert.equal(verifyToken(token,'choice',secret,1001),householdId);
 assert.equal(verifyToken(token,'session',secret,1001),null);
 assert.equal(verifyToken(token+'x','choice',secret,1001),null);
 assert.equal(verifyToken(token,'choice','a different long secret value',1001),null);
 assert.equal(verifyToken(token,'choice',secret,1600),null);
 assert.equal(verifyToken('not-a-token','choice',secret,1001),null);
 assert.equal(verifyToken(token.split('.')[0]+'.'+'é'.repeat(43),'choice',secret,1001),null);
});
test('all invited answers must be explicit, unique and limited to the confirmed household invitations', () => {
 assert.deepEqual(validateResponses([answer],[invitation]),[answer]);
 for (const responses of [[],[answer,answer],[{...answer,guestId:'20000000-0000-4000-8000-000000000002'}],[{...answer,eventId:'30000000-0000-4000-8000-000000000002'}],[{...answer,attendance:'maybe'}],[{...answer,attendance:null}],null,Array(501).fill(answer)]) {
  assert.throws(()=>validateResponses(responses,[invitation]));
 }
});
test('household view omits uninvited events and preserves independent answers', () => {
 const view = buildHouseholdView({id:householdId,display_name:'Example household'},[{id:guestId,display_name:'Alex Example'}],[{...invitation,event:{id:eventId,name:'Wedding',starts_at:null,ends_at:null,time_zone:'America/Chicago',venue_name:null,description:null,attire:null}}],[{...invitation,attendance:'declined'},{guest_id:'foreign',event_id:'private',attendance:'attending'}]);
 assert.equal(view.events.length,1);
 assert.equal(view.events[0].guests.length,1);
 assert.equal(view.events[0].guests[0].attendance,'declined');
 assert.equal(JSON.stringify(view).includes('private'),false);
 assert.equal('address_line_1' in view,false);
});

test('same-origin checks use the browser host when Next internally rewrites the hostname', () => {
 assert.doesNotThrow(()=>checkOrigin(new Request('http://localhost:3100/api/rsvp',{headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'}})));
 assert.throws(()=>checkOrigin(new Request('http://localhost:3100/api/rsvp',{headers:{host:'127.0.0.1:3100',origin:'https://unrelated.example'}})));
 assert.throws(()=>checkOrigin(new Request('http://localhost:3100/api/rsvp',{headers:{host:'localhost:3100','sec-fetch-site':'cross-site'}})));
});

test('events awaiting an exact time follow timed wedding events without reusing attendance answers',()=>{
 const wedding={id:eventId,name:'Wedding',starts_at:'2027-04-04T22:00:00Z',ends_at:null,time_zone:'America/Chicago',venue_name:null,description:null,attire:null};
 const brunch={...wedding,id:'brunch-id',name:'Farewell Brunch',starts_at:null};
 const view=buildHouseholdView({id:householdId,display_name:'Example'},[{id:guestId,display_name:'Example Guest'}],[{guest_id:guestId,event_id:brunch.id,event:brunch},{...invitation,event:wedding}],[{...invitation,attendance:'attending'}]);
 assert.deepEqual(view.events.map(event=>event.name),['Wedding','Farewell Brunch']);
 assert.equal(view.events[1].guests[0].attendance,null);
});

test('name lookup tries the exact name before using a known alternate spelling', async () => {
 const {findWithNameAlias} = await import('../app/lib/rsvp.ts');
 const lookups:string[]=[];
 const lookup = async (name:string) => {
  lookups.push(name);
  return name==='adam alattry'?['matching-household']:[];
 };
 assert.deepEqual(await findWithNameAlias('adam allatry','name',lookup),['matching-household']);
 assert.deepEqual(lookups,['adam allatry','adam alattry']);
 assert.deepEqual(await findWithNameAlias('adam allatry','name',async name=>[name]),['adam allatry']);
 assert.deepEqual(await findWithNameAlias('adam alltry','name',lookup),[]);
});

test('name corrections only apply to invited guests in the confirmed household',()=>{
 const view:Parameters<typeof validateNameCorrection>[0]={
  id:'household',name:'Example household',guests:[{id:'guest',name:'Sam Exampel',dietaryRestrictions:null}],
  events:[{id:'wedding',name:'Wedding',startsAt:null,endsAt:null,timeZone:'America/Chicago',venue:null,description:null,attire:null,
   guests:[{id:'guest',name:'Sam Exampel',attendance:'attending'}]}]
 };
 assert.deepEqual(validateNameCorrection(view,'guest','  Sam   Example  '),{guestId:'guest',previousName:'Sam Exampel',correctedName:'Sam Example'});
 assert.throws(()=>validateNameCorrection(view,'another-guest','Sam Example'),{status:404});
 for(const name of [' ', 'Sam Exampel', 'Sam\nExample', 'a'.repeat(101)])assert.throws(()=>validateNameCorrection(view,'guest',name),{status:400});
});

test('dietary notes are editable (blank clears), bounded and scoped to guests on the invitation',async()=>{
 const {validateDietaryRestrictions}=await import('../app/lib/rsvp.ts');
 const invites=[{guest_id:'alex',event_id:'wedding'},{guest_id:'blair',event_id:'wedding'},{guest_id:'alex',event_id:'brunch'}];
 assert.deepEqual(validateDietaryRestrictions([{guestId:'alex',restrictions:'  Gluten-free\nNo walnuts  '},{guestId:'blair',restrictions:'  '}],invites),[{guestId:'alex',restrictions:'Gluten-free\nNo walnuts'},{guestId:'blair',restrictions:''}]);
 for(const notes of [[{guestId:'foreign',restrictions:'No eggs'}],[{guestId:'alex',restrictions:'a'.repeat(501)}],[{guestId:'alex',restrictions:'First'},{guestId:'alex',restrictions:'Second'}]]) {
  assert.throws(()=>validateDietaryRestrictions(notes,invites),{status:400});
 }
});
