import type {WeddingFormPayload} from './weddingFormTypes.ts';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {RsvpError,issueToken,verifyToken,type Attendance} from './rsvp.ts';

export type AdminHousehold = {
 id:string;display_name:string;contact_email:string|null;phone:string|null;
 address_line_1:string|null;address_line_2:string|null;city:string|null;region:string|null;postal_code:string|null;country_code:string|null;
 mailing_status:string;grouping_needs_review:boolean;
};
export type AdminGuest = {id:string;household_id:string;display_name:string;email:string|null;is_family:boolean|null;dietary_restrictions?:string|null};
export type AdminInvitation = {guest_id:string;event_id:string;review_required:boolean;assignment_source:string;is_active:boolean};
export type AdminResponse = {guest_id:string;event_id:string;attendance:string};
export type PlanningIssue = {id:string;subject:string;detail:string;household_id:string|null;resolved_at:string|null};
export type AddressSubmission={id:string;payload:WeddingFormPayload;household_id:string|null;review_reason:string|null;received_at:string};
export type AdminOverview = {
 householdChoices?:Pick<AdminHousehold,'id'|'display_name'>[];
 addressSubmissions:AddressSubmission[];
 stats:{guests:number;households:number;mailingHolds:number;missingAddresses:number;familyUnknown:number;invitationReviews:number;householdReviews:number};
 households:AdminHousehold[];
 events:{id:string;name:string}[];
 rows:{id:string;name:string;email:string|null;family:boolean|null;dietaryRestrictions:string|null;household:AdminHousehold;flags:string[];invitations:{eventId:string;name:string;attendance:string|null;needsReview:boolean;source:string;active:boolean}[]}[];
 issues:PlanningIssue[];
};
const adminIdentity='00000000-0000-4000-8000-000000000000';
function sessionKey(passphrase:string,secret:string){return createHmac('sha256',secret).update('wedding-admin:'+passphrase).digest('hex');}
export function matchesAdminPassphrase(supplied:unknown,expected:string):boolean {
 if(typeof supplied!=='string'||supplied.length>256||!expected)return false;
 return timingSafeEqual(createHash('sha256').update(supplied).digest(),createHash('sha256').update(expected).digest());
}
export function issueAdminSession(passphrase:string,secret:string,now=Math.floor(Date.now()/1000)):string {
 if(!passphrase||secret.length<32)throw new Error('Admin session is not configured');
 return issueToken(adminIdentity,'session',sessionKey(passphrase,secret),now,8*60*60);
}
export function verifyAdminSession(token:unknown,passphrase:string,secret:string,now=Math.floor(Date.now()/1000)):boolean {
 return Boolean(passphrase)&&secret.length>=32&&verifyToken(token,'session',sessionKey(passphrase,secret),now)===adminIdentity;
}
export function buildAdminOverview(households:AdminHousehold[],guests:AdminGuest[],events:{id:string;name:string}[],invitations:AdminInvitation[],responses:AdminResponse[],issues:PlanningIssue[]):AdminOverview {
 const byHousehold=new Map(households.map(h=>[h.id,h]));
 const byEvent=new Map(events.map(event=>[event.id,event]));
 const byResponse=new Map(responses.map(response=>[`${response.guest_id}:${response.event_id}`,response.attendance]));
 const rows=guests.map(guest=>{
  const household=byHousehold.get(guest.household_id);
  if(!household)throw new Error('Guest has no household record');
  const invited=invitations.filter(invite=>invite.guest_id===guest.id).map(invite=>({eventId:invite.event_id,name:byEvent.get(invite.event_id)?.name??'Event',attendance:byResponse.get(`${guest.id}:${invite.event_id}`)??null,needsReview:invite.review_required,source:invite.assignment_source,active:invite.is_active}));
  const flags:string[]=[];
  if(household.mailing_status==='on_hold')flags.push('Mailing on hold');
  if(household.mailing_status==='missing_address')flags.push('Mailing address missing');
  if(household.grouping_needs_review)flags.push('Household grouping needs review');
  if(guest.is_family===null)flags.push('Family status unknown');
  if(invited.some(invite=>invite.active&&invite.needsReview))flags.push('Event invitation needs review');
  if(!guest.email&&!household.contact_email)flags.push('Contact email missing');
  return {id:guest.id,name:guest.display_name,email:guest.email??household.contact_email,family:guest.is_family,dietaryRestrictions:guest.dietary_restrictions??null,household,flags,invitations:invited};
 }).sort((a,b)=>a.name.localeCompare(b.name));
 return {addressSubmissions:[],stats:{guests:guests.length,households:households.length,mailingHolds:households.filter(h=>h.mailing_status==='on_hold').length,missingAddresses:households.filter(h=>h.mailing_status==='missing_address').length,familyUnknown:guests.filter(g=>g.is_family===null).length,invitationReviews:invitations.filter(i=>i.is_active&&i.review_required).length,householdReviews:households.filter(h=>h.grouping_needs_review).length},households,events,rows,issues:issues.filter(issue=>!issue.resolved_at)};
}

export function validateAdminEdit(input:unknown):{table:string;id:string;values:Record<string,unknown>} {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RsvpError('Invalid edit.');
 const body=input as Record<string,unknown>;
 if(typeof body.id!=='string'||!isUuid(body.id))throw new RsvpError('Invalid record.');
 const allowed=body.kind==='guest'?['display_name','is_family','household_id']:body.kind==='household'?['display_name','contact_email','phone','address_line_1','address_line_2','city','region','postal_code','country_code','mailing_status','grouping_needs_review']:[];
 const values:Record<string,unknown>={};
 for(const [field,value] of Object.entries(body)){
  if(field==='id'||field==='kind')continue;
  if(!allowed.includes(field))throw new RsvpError('Invalid edit field.');
  if(field==='is_family'){if(value!==null&&typeof value!=='boolean')throw new RsvpError('Choose a family status.');}
  else if(field==='grouping_needs_review'){if(typeof value!=='boolean')throw new RsvpError('Choose a household review status.');}
  else if(field==='household_id'){if(typeof value!=='string'||!isUuid(value)||['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'].includes(value))throw new RsvpError('Choose a household.');}
  else if(field==='mailing_status'){if(!['ready','missing_address','on_hold','unreviewed'].includes(String(value)))throw new RsvpError('Choose a mailing status.');}
  else {
   if(value!==null&&(typeof value!=='string'||value.length>300||/[\u0000-\u001f]/.test(value)))throw new RsvpError('Invalid text field.');
   if(field==='display_name'&&(typeof value!=='string'||!value.trim()))throw new RsvpError('Enter a name.');
   if(field==='contact_email'&&value!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)))throw new RsvpError('Enter a valid email address.');
   if(field==='country_code'&&value!==null&&!/^[A-Z]{2}$/.test(String(value)))throw new RsvpError('Use a two-letter country code.');
  }
  values[field]=typeof value==='string'?value.trim():value;
 }
 if(!Object.keys(values).length)throw new RsvpError('Choose something to update.');
 return {table:body.kind==='guest'?'guests':'households',id:body.id,values};
}
export function isUuid(value:unknown):value is string {return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}

export function validateInvitationChange(input:unknown):{guestId:string;eventId:string;active:boolean}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RsvpError('Invalid invitation.');
 const body=input as Record<string,unknown>;
 if(body.kind!=='set-invitation'||!isUuid(body.guestId)||!isUuid(body.eventId)||typeof body.active!=='boolean'||Object.keys(body).some(field=>!['kind','guestId','eventId','active'].includes(field)))throw new RsvpError('Choose a guest, event, and invitation status.');
 return {guestId:body.guestId,eventId:body.eventId,active:body.active};
}

export function buildHouseholdList(households:AdminHousehold[],guests:AdminGuest[],events:{id:string;name:string}[],invitations:AdminInvitation[],responses:AdminResponse[]=[]){
 const responsesByEvent=new Map<string,Map<string,Attendance>>();
 for(const response of responses){
  if(response.attendance!=='attending'&&response.attendance!=='declined')continue;
  const answers=responsesByEvent.get(response.event_id)??new Map<string,Attendance>();
  answers.set(response.guest_id,response.attendance);
  responsesByEvent.set(response.event_id,answers);
 }
 const guestsByHousehold=new Map<string,AdminGuest[]>();
 const invitationsByGuest=new Map<string,AdminInvitation[]>();
 for(const guest of guests){const group=guestsByHousehold.get(guest.household_id)??[];group.push(guest);guestsByHousehold.set(guest.household_id,group);}
 for(const invitation of invitations){const group=invitationsByGuest.get(invitation.guest_id)??[];group.push(invitation);invitationsByGuest.set(invitation.guest_id,group);}
 return {events,rows:households.map(household=>{
  const members=guestsByHousehold.get(household.id)??[];
  return {id:household.id,name:household.display_name,email:household.contact_email,addressLines:household.address_line_1?.trim()?[household.address_line_1,household.address_line_2,[household.city,household.region,household.postal_code].filter(Boolean).join(', '),household.country_code].filter((line):line is string=>Boolean(line?.trim())):[],mailingStatus:household.mailing_status,needsReview:household.grouping_needs_review,guests:members.map(guest=>({id:guest.id,name:guest.display_name,dietaryRestrictions:guest.dietary_restrictions??null})),events:events.map(event=>{
   const invited=members.flatMap(guest=>invitationsByGuest.get(guest.id)??[]).filter(invitation=>invitation.event_id===event.id&&invitation.is_active);
   const answered=responsesByEvent.get(event.id);
   const guestResponses=members.flatMap(guest=>{
    const attendance=answered?.get(guest.id);
    return attendance?[{guestId:guest.id,attendance}]:[];
   });
   return {id:event.id,guestResponses,respondedGuestIds:guestResponses.map(guest=>guest.guestId),invitedGuestCount:invited.length,invitedGuestIds:invited.map(invitation=>invitation.guest_id),status:invited.length===0?'Not invited':invited.length===members.length?'Invited':'Mixed',needsReview:invited.some(invitation=>invitation.review_required)};
  })};
 })};
}
export type HouseholdList=ReturnType<typeof buildHouseholdList>;
export function validateHouseholdInvitationChange(input:unknown):{householdId:string;eventId:string;active:boolean}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RsvpError('Invalid invitation.');
 const body=input as Record<string,unknown>;
 if(body.kind!=='set-household-invitation'||!isUuid(body.householdId)||!isUuid(body.eventId)||typeof body.active!=='boolean'||Object.keys(body).some(field=>!['kind','householdId','eventId','active'].includes(field)))throw new RsvpError('Choose a household, event, and invitation status.');
 return {householdId:body.householdId,eventId:body.eventId,active:body.active};
}

export function validateAdminCreate(input:unknown):{newHousehold:boolean;householdId:string;householdName:string|null;guests:{id:string;name:string}[];eventIds:string[]}{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new RsvpError('Invalid addition.');
 const body=input as Record<string,unknown>;
 const newHousehold=body.kind==='create-household';
 const allowed=newHousehold?['kind','householdId','householdName','guests','eventIds']:['kind','householdId','guests'];
 if((!newHousehold&&body.kind!=='add-guests')||Object.keys(body).some(field=>!allowed.includes(field))||!isUuid(body.householdId)||body.householdId.startsWith('10000000-0000-4000-8000-00000000000'))throw new RsvpError('Choose a household.');
 function name(value:unknown){if(typeof value!=='string'||!value.trim()||value.length>300||/[\u0000-\u001f]/.test(value))throw new RsvpError('Enter a name of up to 300 characters.');return value.trim();}
 const householdName=newHousehold?name(body.householdName):null;
 if(!Array.isArray(body.guests)||body.guests.length<1||body.guests.length>20)throw new RsvpError('Add between 1 and 20 named guests.');
 const guests=body.guests.map((value:unknown)=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new RsvpError('Invalid guest.');const guest=value as Record<string,unknown>;if(!isUuid(guest.id)||Object.keys(guest).some(field=>!['id','name'].includes(field)))throw new RsvpError('Invalid guest.');return {id:guest.id,name:name(guest.name)};});
 if(new Set(guests.map(guest=>guest.id)).size!==guests.length||new Set(guests.map(guest=>guest.name.replace(/\s+/g,' ').toLowerCase())).size!==guests.length)throw new RsvpError('Each guest must be listed once.');
 const eventIds=newHousehold?body.eventIds:[];
 if(!Array.isArray(eventIds)||eventIds.length>20||eventIds.some(id=>!isUuid(id)||id.startsWith('30000000-0000-4000-8000-00000000000'))||new Set(eventIds).size!==eventIds.length)throw new RsvpError('Choose valid events.');
 return {newHousehold,householdId:body.householdId,householdName,guests,eventIds:eventIds as string[]};
}
