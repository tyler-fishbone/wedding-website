import type {HouseholdList} from './admin.ts';
export function countInvitedHouseholds(rows:HouseholdList['rows'],eventId:string):{households:number;guests:number}{
 return rows.reduce((total,row)=>{
  const guests=eventId?(row.events.find(event=>event.id===eventId)?.invitedGuestCount??0):row.guests.length;
  return {households:total.households+(guests>0?1:0),guests:total.guests+guests};
 },{households:0,guests:0});
}

export function householdsForEvent(rows:HouseholdList['rows'],eventId:string):HouseholdList['rows']{
 if(!eventId)return rows.filter(row=>row.guests.length>0);
 return rows.flatMap(row=>{
  const invitedIds=new Set(row.events.find(event=>event.id===eventId)?.invitedGuestIds??[]);
  const guests=row.guests.filter(guest=>invitedIds.has(guest.id));
  return guests.length?[{...row,guests}]:[];
 });
}

export type HouseholdRsvpStatus='complete'|'partial'|'unanswered'|'not-invited';
export type GuestRsvpStatus='yes'|'no'|'mixed'|'partial'|'pending'|'not-invited';

export function summarizeHouseholdRsvp(row:HouseholdList['rows'][number],eventId:string){
 const events=row.events.filter(event=>!eventId||event.id===eventId);
 const guests=row.guests.map(guest=>{
  const responses=events.flatMap(event=>{
   if(!event.invitedGuestIds.includes(guest.id))return [];
   const attendance=event.guestResponses.find(response=>response.guestId===guest.id)?.attendance??null;
   return [{eventId:event.id,attendance}];
  });
  const answered=responses.filter(response=>response.attendance!==null);
  let status:GuestRsvpStatus='not-invited';
  if(responses.length){
   if(!answered.length)status='pending';
   else if(answered.length<responses.length)status='partial';
   else if(answered.every(response=>response.attendance==='attending'))status='yes';
   else if(answered.every(response=>response.attendance==='declined'))status='no';
   else status='mixed';
  }
  return {...guest,status,responses};
 });
 const hasAnswers=guests.some(guest=>guest.responses.some(response=>response.attendance!==null));
 const needsResponse=guests.some(guest=>guest.status==='pending'||guest.status==='partial');
 const status:HouseholdRsvpStatus=needsResponse?(hasAnswers?'partial':'unanswered'):(hasAnswers?'complete':'not-invited');
 return {status,guests};
}
