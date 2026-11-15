import assert from 'node:assert/strict';
import test from 'node:test';
import {buildSchedule,hasPendingRsvps,type ScheduleEventRecord} from '../app/lib/schedule.ts';
import type {HouseholdView} from '../app/lib/rsvp.ts';
import {events as publishedDetails} from '../app/content/wedding.ts';
const record:ScheduleEventRecord={id:'wedding-id',slug:'wedding',name:'Wedding',starts_at:'2027-04-04T22:00:00Z',ends_at:'2027-04-05T04:00:00Z',time_zone:'America/Chicago',venue_name:'The Addison Grove',address_line_1:'11903 Fitzhugh Road',address_line_2:null,city:'Austin',region:'TX',postal_code:'78736',country_code:'US',description:null,attire:'Cocktail'};
const view:HouseholdView={id:'example',name:'Example household',events:[{id:record.id,name:record.name,startsAt:record.starts_at,endsAt:record.ends_at,timeZone:record.time_zone,venue:record.venue_name,description:null,attire:record.attire,guests:[{id:'guest',name:'Example Guest',attendance:null}]}]};
test('schedule includes invited events only, even when other records or static content are supplied',()=>{
 const result=buildSchedule(view,[{...record,id:'private',slug:'welcome-party',name:'Private welcome'},record],publishedDetails);
 assert.equal(result.length,1);assert.equal(result[0].id,record.id);assert.equal(result[0].name,'Wedding');
 assert.equal(result[0].address,'11903 Fitzhugh Road');assert.equal(result[0].attire,'Cocktail');
 assert.match(result[0].time,/5:00 PM.*11:00 PM/);assert.equal(result[0].startDateTime,'20270404T170000');
 assert.equal(JSON.stringify(result).includes('Nica'),false);
});
test('new invited events work without static content, including unknown locations and no end time',()=>{
 const event={...record,slug:'new-brunch',name:'Goodbye brunch',venue_name:null,address_line_1:null,city:null,region:null,postal_code:null,starts_at:null,ends_at:null,attire:null};
 const result=buildSchedule(view,[event],[])[0];
 assert.equal(result.name,'Goodbye brunch');assert.equal(result.location,'Location to be announced');assert.equal(result.time,'Time to be announced');assert.equal(result.endDateTime,undefined);
 const barbecue=buildSchedule(view,[{...record,ends_at:null}],[])[0];assert.equal(barbecue.time,'5:00 PM');assert.equal(barbecue.endDateTime,undefined);
});
test('only unanswered invited responses trigger a reminder; declined and empty schedules do not',()=>{
 assert.equal(hasPendingRsvps(view),true);
 for(const attendance of ['attending','declined'] as const){assert.equal(hasPendingRsvps({...view,events:view.events.map(event=>({...event,guests:event.guests.map(guest=>({...guest,attendance}))}))}),false);}
 assert.equal(hasPendingRsvps({...view,events:[]}),false);
});

test('farewell brunch shows its Austin time while the location is pending',()=>{
 const event={...record,slug:'farewell-brunch',name:'Farewell Brunch',starts_at:'2027-04-05T14:30:00Z',ends_at:'2027-04-05T16:30:00Z',venue_name:null,address_line_1:null,city:null,region:null,postal_code:null,attire:null};
 const result=buildSchedule(view,[event],publishedDetails)[0];
 assert.equal(result.eyebrow,'Monday, April 5');assert.equal(result.time,'9:30 AM–11:30 AM');
 assert.equal(result.location,'Location to be announced');assert.equal(result.attire,'');
 assert.equal(result.startDateTime,'20270405T093000');assert.equal(result.endDateTime,'20270405T113000');
 const publishedBrunch=publishedDetails.find(details=>details.id==='farewell-brunch');
 assert.equal(result.startDateTime,publishedBrunch?.startDateTime);
 assert.equal(result.endDateTime,publishedBrunch?.endDateTime);
});
test('welcome party has no placeholder dress code when attire is omitted',()=>{
 const result=buildSchedule(view,[{...record,slug:'welcome-party',attire:null}],publishedDetails)[0];
 assert.equal(result.attire,'');
});
