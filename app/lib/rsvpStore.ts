import 'server-only';
import {createHash} from 'node:crypto';
import { buildHouseholdView, findWithNameAlias, RsvpError, type GuestRecord, type InvitationRecord, type EventRecord, type ResponseInput, type DietaryRestrictionInput } from './rsvp';

function databaseConfig(){
 const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw new RsvpError('The service is not configured yet.',503);
 return {url,key};
}
export function rsvpConfig() {
 const {url,key}=databaseConfig();
 const sessionSecret=process.env.RSVP_SESSION_SECRET;
 if(!sessionSecret||sessionSecret.length<32)throw new RsvpError('Online RSVPs are not open yet. Please check back soon.',503);
 return {url,key,sessionSecret};
}
export async function database<T>(path: string, body?: unknown, method?: 'PATCH', prefer?: string): Promise<T> {
 const {url,key} = databaseConfig();
 const response = await fetch(`${url}/rest/v1/${path}`,{
  method:method??(body === undefined?'GET':'POST'),
  headers:{apikey:key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:method==='PATCH'?{Prefer:'return=representation'}:{})},
  ...(body === undefined?{}:{body:JSON.stringify(body)}),
  cache:'no-store', signal:AbortSignal.timeout(15000)
 });
 if (!response.ok) throw new RsvpError('We couldn’t reach the RSVP service. Please try again.',503);
 const text = await response.text();
 return (text?JSON.parse(text):null) as T;
}
export async function findHouseholds(query: string, mode: 'name'|'email') {
 const matches = await findWithNameAlias(query,mode,name=>
  database<{id:string;display_name:string;guest_names:string[]}[]>('rpc/find_rsvp_households',{p_query:name,p_mode:mode})
 );
 if (matches.length > 10) throw new RsvpError('Please try your email address to narrow your search.');
 return matches;
}
export async function loadHousehold(householdId: string) {
 const householdFilter = new URLSearchParams({id:`eq.${householdId}`,select:'id,display_name'});
 const guestFilter = new URLSearchParams({archived_at:'is.null',household_id:`eq.${householdId}`,select:'id,display_name,dietary_restrictions',order:'display_name'});
 const [households,guests] = await Promise.all([
  database<{id:string;display_name:string}[]>(`households?${householdFilter}`),
  database<GuestRecord[]>(`guests?${guestFilter}`)
 ]);
 if (!households[0] || !guests.length) throw new RsvpError('We couldn’t find your invitation.',404);
 const guestIds = guests.map(guest=>guest.id).join(',');
 const inviteFilter = new URLSearchParams({is_active:'eq.true',guest_id:`in.(${guestIds})`,select:'guest_id,event_id,event:events(id,name,starts_at,ends_at,time_zone,venue_name,description,attire)'});
 const responseFilter = new URLSearchParams({guest_id:`in.(${guestIds})`,select:'guest_id,event_id,attendance'});
 const [invitations,responses] = await Promise.all([
  database<(InvitationRecord & {event:EventRecord})[]>(`invitations?${inviteFilter}`),
  database<(InvitationRecord & {attendance:string})[]>(`rsvp_responses?${responseFilter}`)
 ]);
 return {view:buildHouseholdView(households[0],guests,invitations,responses),invitations};
}
export async function saveDietaryRestrictions(householdId:string,notes:DietaryRestrictionInput[]) {
 await database('rpc/save_household_dietary_restrictions',{p_household_id:householdId,p_notes:notes});
}
export async function saveResponses(householdId: string, responses: ResponseInput[]) {
 await database('rpc/save_household_rsvp',{p_household_id:householdId,p_responses:responses});
}

export async function saveNameCorrection(householdId:string,correction:{guestId:string;previousName:string;correctedName:string}){
 const fingerprint=createHash('sha256').update(JSON.stringify([householdId,correction.guestId,correction.previousName,correction.correctedName])).digest('hex');
 await database('planning_issues?on_conflict=source_key',{
  source_key:'guest-name-correction:'+fingerprint,
  household_id:householdId,
  subject:'Guest name correction',
  detail:correction.previousName+' → '+correction.correctedName
 },undefined,'resolution=ignore-duplicates,return=minimal');
}
