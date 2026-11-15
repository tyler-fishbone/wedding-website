import assert from 'node:assert/strict';
import test from 'node:test';
import {matchesAdminPassphrase,issueAdminSession,verifyAdminSession,buildAdminOverview,validateAdminEdit,validateInvitationChange,buildHouseholdList,validateHouseholdInvitationChange} from '../app/lib/admin.ts';
test('admin passphrases stay server checked and rotated passphrases invalidate sessions',()=>{
 const passphrase='test-only-private-passphrase';
 const signingSecret='test-only-session-secret-over-thirty-two-characters';
 assert.equal(matchesAdminPassphrase(passphrase,passphrase),true);
 assert.equal(matchesAdminPassphrase('wrong',passphrase),false);
 assert.equal(matchesAdminPassphrase(null,passphrase),false);
 const token=issueAdminSession(passphrase,signingSecret,1000);
 assert.equal(verifyAdminSession(token,passphrase,signingSecret,1001),true);
 assert.equal(verifyAdminSession(token,'a-new-private-passphrase',signingSecret,1001),false);
 assert.equal(verifyAdminSession(token+'x',passphrase,signingSecret,1001),false);
 assert.equal(verifyAdminSession(token,passphrase,signingSecret,1000+8*60*60),false);
});
test('admin review keeps address holds, unknown family status, provisional invitations and missing names visible',()=>{
 const overview=buildAdminOverview([{id:'h1',display_name:'Example household',contact_email:null,phone:null,address_line_1:'Old address',address_line_2:null,city:'Austin',region:'TX',postal_code:'78701',country_code:'US',mailing_status:'on_hold',grouping_needs_review:true}],[{id:'g1',household_id:'h1',display_name:'Alex Example',email:null,is_family:null}],[{id:'e1',name:'Welcome party'}],[{guest_id:'g1',event_id:'e1',review_required:true,assignment_source:'mailing-address-first-pass',is_active:true}],[],[{id:'i1',subject:'Guest name needed',detail:'Confirm full name',household_id:null,resolved_at:null}]);
 assert.equal(overview.stats.guests,1);
 assert.equal(overview.stats.households,1);
 assert.equal(overview.stats.mailingHolds,1);
 assert.equal(overview.stats.familyUnknown,1);
 assert.equal(overview.stats.invitationReviews,1);
 assert.deepEqual(overview.rows[0].flags,['Mailing on hold','Household grouping needs review','Family status unknown','Event invitation needs review','Contact email missing']);
 assert.equal(overview.rows[0].invitations[0].attendance,null);
 assert.equal(overview.issues[0].subject,'Guest name needed');
});

test('admin edits accept only bounded explicit fields and valid identifiers',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 assert.deepEqual(validateAdminEdit({kind:'guest',id,is_family:true}),{table:'guests',id,values:{is_family:true}});
 assert.throws(()=>validateAdminEdit({kind:'guest',id,is_family:'yes'}));
 assert.throws(()=>validateAdminEdit({kind:'guest',id,household_id:'bad'}));
 assert.throws(()=>validateAdminEdit({kind:'household',id,mailing_status:'invented'}));
 assert.throws(()=>validateAdminEdit({kind:'guest',id,unknown:'field'}));
 assert.throws(()=>validateAdminEdit({kind:'guest',id}));
});


test('empty households remain available for reassignment and correction',()=>{
 const household={id:'empty',display_name:'Empty',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'unreviewed',grouping_needs_review:false};
 const overview=buildAdminOverview([household],[],[],[],[],[]);
 assert.equal(overview.households[0].id,'empty');
 assert.equal(overview.stats.households,1);
});


test('invitation edits require explicit boolean status and valid guest and event IDs',()=>{
 const guestId='20000000-0000-4000-8000-000000000001';
 const eventId='30000000-0000-4000-8000-000000000001';
 assert.deepEqual(validateInvitationChange({kind:'set-invitation',guestId,eventId,active:false}),{guestId,eventId,active:false});
 for(const input of [{kind:'set-invitation',guestId,eventId},{kind:'set-invitation',guestId,eventId,active:'false'},{kind:'set-invitation',guestId:'bad',eventId,active:true},{kind:'set-invitation',guestId,eventId:'bad',active:true},{kind:'set-invitation',guestId,eventId,active:true,extra:1}])assert.throws(()=>validateInvitationChange(input));
});

test('removed invitations retain prior responses without counting as pending invitation reviews',()=>{
 const household={id:'h',display_name:'Household',contact_email:'a@example.com',phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'unreviewed',grouping_needs_review:false};
 const overview=buildAdminOverview([household],[{id:'g',household_id:'h',display_name:'Guest',email:null,is_family:false}],[{id:'e',name:'Event'}],[{guest_id:'g',event_id:'e',review_required:true,assignment_source:'manual',is_active:false}],[{guest_id:'g',event_id:'e',attendance:'attending'}],[]);
 assert.equal(overview.rows[0].invitations[0].active,false);
 assert.equal(overview.rows[0].invitations[0].attendance,'attending');
 assert.equal(overview.stats.invitationReviews,0);
 assert.equal(overview.rows[0].flags.includes('Event invitation needs review'),false);
});

 test('household table groups guests and flags inconsistent invitations without duplicating rows',()=>{
 const household={id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'missing_address',grouping_needs_review:false};
 const guests=['a','b'].map(id=>({id,household_id:'h',display_name:id,email:null,is_family:null}));
 const result=buildHouseholdList([household],guests,[{id:'e',name:'Wedding'}],[{guest_id:'a',event_id:'e',review_required:true,assignment_source:'manual',is_active:true}]);
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].guests.length,2);
 assert.equal(result.rows[0].events[0].status,'Mixed');
 assert.equal(result.rows[0].events[0].needsReview,true);
 assert.equal('addressSubmissions' in result,false);
 });
 test('household invitation changes validate household instead of guest identifiers',()=>{
 const householdId='10000000-0000-4000-8000-000000000001',eventId='30000000-0000-4000-8000-000000000001';
 assert.deepEqual(validateHouseholdInvitationChange({kind:'set-household-invitation',householdId,eventId,active:true}),{householdId,eventId,active:true});
 assert.throws(()=>validateHouseholdInvitationChange({kind:'set-household-invitation',householdId,eventId,active:'yes'}));
 assert.throws(()=>validateHouseholdInvitationChange({kind:'set-household-invitation',householdId:'bad',eventId,active:true}));
 });

test('real guests cannot be moved into hidden demo households',()=>{assert.throws(()=>validateAdminEdit({kind:'guest',id:'20000000-0000-4000-8000-000000000005',household_id:'10000000-0000-4000-8000-000000000001'}));});

test('creating a household validates named guests, invitation events and retry identifiers',async()=>{
 const {validateAdminCreate}=await import('../app/lib/admin.ts');
 const householdId='90000000-0000-4000-8000-000000000001',guestId='90000000-0000-4000-8000-000000000002',eventId='90000000-0000-4000-8000-000000000003';
 const body={kind:'create-household',householdId,householdName:' Example family ',guests:[{id:guestId,name:' Alex Example '}],eventIds:[eventId]};
 assert.equal(validateAdminCreate(body).householdName,'Example family');
 assert.equal(validateAdminCreate(body).guests[0].name,'Alex Example');
 for(const bad of [{...body,guests:[]},{...body,householdName:''},{...body,guests:[{id:guestId,name:''}]},{...body,guests:[{id:guestId,name:'Alex'},{id:guestId,name:'Sam'}]},{...body,eventIds:['bad']},{...body,unexpected:true},{...body,householdId:'10000000-0000-4000-8000-000000000001'}])assert.throws(()=>validateAdminCreate(bad));
 assert.equal(validateAdminCreate({kind:'add-guests',householdId,guests:body.guests}).householdName,null);
 assert.throws(()=>validateAdminCreate({kind:'add-guests',householdId,guests:body.guests,eventIds:[eventId]}));
});

test('household overview includes mailing address lines and leaves missing addresses empty',()=>{
 const base={id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:'123 Main Street',address_line_2:'Apt 2',city:'Austin',region:'TX',postal_code:'78701',country_code:'US',mailing_status:'on_hold',grouping_needs_review:false};
 const list=buildHouseholdList([base,{...base,id:'missing',address_line_1:null,address_line_2:null}],[],[],[]);
 assert.deepEqual(list.rows[0].addressLines,['123 Main Street','Apt 2','Austin, TX, 78701','US']);
 assert.equal(list.rows[0].mailingStatus,'on_hold');
 assert.deepEqual(list.rows[1].addressLines,[]);
});

test('event totals count invited people rather than every member of a partly invited household',async()=>{
 const {countInvitedHouseholds}=await import('../app/lib/adminCounts.ts');
 const household={id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'missing_address',grouping_needs_review:false};
 const guests=['a','b'].map(id=>({id,household_id:'h',display_name:id,email:null,is_family:null}));
 const list=buildHouseholdList([household,{...household,id:'other'}],guests,[{id:'e',name:'Event'}],[{guest_id:'a',event_id:'e',review_required:false,assignment_source:'manual',is_active:true}]);
 assert.deepEqual(countInvitedHouseholds(list.rows,'e'),{households:1,guests:1});
 assert.deepEqual(countInvitedHouseholds(list.rows,'unknown'),{households:0,guests:0});
 assert.deepEqual(countInvitedHouseholds(list.rows,''),{households:1,guests:2});
});

test('selecting an event hides uninvited households and people and all-events restores the full list',async()=>{
 const {householdsForEvent}=await import('../app/lib/adminCounts.ts');
 const h={id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'missing_address',grouping_needs_review:false};
 const guests=[{id:'a',household_id:'h',display_name:'Invited',email:null,is_family:null},{id:'b',household_id:'h',display_name:'Not invited',email:null,is_family:null},{id:'c',household_id:'other',display_name:'Other household',email:null,is_family:null}];
 const list=buildHouseholdList([h,{...h,id:'other'}],guests,[{id:'e',name:'Event'}],[{guest_id:'a',event_id:'e',is_active:true,assignment_source:'manual',review_required:false}]);
 const filtered=householdsForEvent(list.rows,'e');
 assert.equal(filtered.length,1);assert.deepEqual(filtered[0].guests.map(guest=>guest.id),['a']);
 assert.equal(householdsForEvent(list.rows,'').length,2);
 assert.equal(list.rows[0].guests.length,2,'Filtering must not alter stored household members');
 assert.deepEqual(householdsForEvent(list.rows,'unknown'),[]);
});

test('household RSVP status counts declines and ignores answers for inactive invitations', async () => {
 const {summarizeHouseholdRsvp} = await import('../app/lib/adminCounts.ts');
 const household = {id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'ready',grouping_needs_review:false};
 const guests = ['Alex','Blair','Casey'].map(name => ({id:name,household_id:'h',display_name:name,email:null,is_family:null}));
 const events = [{id:'wedding',name:'Wedding'},{id:'welcome',name:'Welcome party'},{id:'brunch',name:'Brunch'},{id:'other',name:'Other'}];
 const invitation = (guest_id:string,event_id:string,is_active = true) => ({guest_id,event_id,is_active,assignment_source:'manual',review_required:false});
 const list = buildHouseholdList([household],guests,events,[
  invitation('Alex','wedding'),invitation('Blair','wedding'),
  invitation('Alex','welcome'),invitation('Casey','welcome',false),
  invitation('Blair','brunch')
 ],[
  {guest_id:'Alex',event_id:'wedding',attendance:'declined'},
  {guest_id:'Alex',event_id:'welcome',attendance:'attending'},
  {guest_id:'Casey',event_id:'welcome',attendance:'attending'}
 ]);
 const [row] = list.rows;
 assert.equal(summarizeHouseholdRsvp(row,'').status,'partial');
 assert.equal(summarizeHouseholdRsvp(row,'wedding').status,'partial');
 assert.equal(summarizeHouseholdRsvp(row,'welcome').status,'complete');
 assert.equal(summarizeHouseholdRsvp(row,'brunch').status,'unanswered');
 assert.equal(summarizeHouseholdRsvp(row,'other').status,'not-invited');
});

test('guest RSVP badges distinguish yes, no, mixed, partial and pending by event',async()=>{
 const {summarizeHouseholdRsvp}=await import('../app/lib/adminCounts.ts');
 const household={id:'h',display_name:'Family',contact_email:null,phone:null,address_line_1:null,address_line_2:null,city:null,region:null,postal_code:null,country_code:null,mailing_status:'ready',grouping_needs_review:false};
 const guests=['Alex','Blair','Casey','Drew','Evan'].map(name=>({id:name,household_id:'h',display_name:name,email:null,is_family:null}));
 const events=[{id:'wedding',name:'Wedding'},{id:'brunch',name:'Brunch'}];
 const invitations=events.flatMap(event=>guests.map(guest=>({guest_id:guest.id,event_id:event.id,is_active:guest.id!=='Evan',assignment_source:'manual',review_required:false})));
 const [row]=buildHouseholdList([household],guests,events,invitations,[
  {guest_id:'Alex',event_id:'wedding',attendance:'attending'},
  {guest_id:'Alex',event_id:'brunch',attendance:'declined'},
  {guest_id:'Blair',event_id:'wedding',attendance:'declined'},
  {guest_id:'Blair',event_id:'brunch',attendance:'declined'},
  {guest_id:'Casey',event_id:'wedding',attendance:'attending'},
  {guest_id:'Evan',event_id:'wedding',attendance:'attending'},
 ]).rows;
 assert.deepEqual(summarizeHouseholdRsvp(row,'').guests.map(guest=>[guest.name,guest.status]),[
  ['Alex','mixed'],['Blair','no'],['Casey','partial'],['Drew','pending'],['Evan','not-invited'],
 ]);
 assert.deepEqual(summarizeHouseholdRsvp(row,'wedding').guests.map(guest=>guest.status),['yes','no','yes','pending','not-invited']);
});
