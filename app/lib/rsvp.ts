import { createHmac, timingSafeEqual } from 'node:crypto';

export type Attendance = 'attending' | 'declined';
export type ResponseInput = { guestId: string; eventId: string; attendance: Attendance };
export type DietaryRestrictionInput = {guestId:string;restrictions:string};
export type InvitationRecord = { guest_id: string; event_id: string };
export type GuestRecord = { id: string; display_name: string; dietary_restrictions?: string | null };
export type EventRecord = { id: string; name: string; starts_at: string | null; ends_at: string | null; time_zone: string; venue_name: string | null; description: string | null; attire: string | null };
export type HouseholdView = {
 id: string; name: string;
 guests: { id: string; name: string; dietaryRestrictions: string | null }[];
 events: { id: string; name: string; startsAt: string | null; endsAt: string | null; timeZone: string; venue: string | null; description: string | null; attire: string | null; guests: { id: string; name: string; attendance: Attendance | null }[] }[];
};
export class RsvpError extends Error {
 status: number;
 constructor(message: string, status = 400) { super(message); this.name = 'RsvpError'; this.status = status; }
}
export function normalizeLookup(value: unknown, mode: unknown): string {
 if (typeof value !== 'string' || (mode !== 'name' && mode !== 'email')) throw new RsvpError('Enter your full name or email address.');
 const normalized = value.trim().replace(/\s+/g,' ').toLowerCase();
 if (normalized.length < 2 || normalized.length > 200 || /[%*\\\u0000-\u001f]/.test(normalized)) throw new RsvpError('Enter your full name or email address.');
 if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new RsvpError('Enter a valid email address.');
 return normalized;
}
const alternateGuestNames = new Map([['adam allatry','adam alattry']]);

export async function findWithNameAlias<Match>(query:string,mode:'name'|'email',lookup:(query:string)=>Promise<Match[]>):Promise<Match[]> {
 const matches=await lookup(query);
 const alternate=mode==='name'&&!matches.length?alternateGuestNames.get(query):undefined;
 return alternate?lookup(alternate):matches;
}

export function validateDietaryRestrictions(value:unknown,invitations:InvitationRecord[]):DietaryRestrictionInput[] {
 if(!Array.isArray(value)||value.length>500)throw new RsvpError('Enter valid dietary restrictions.');
 const allowed=new Set(invitations.map(invitation=>invitation.guest_id));
 const seen=new Set<string>();
 const notes:DietaryRestrictionInput[]=[];
 for(const item of value){
  if(!item||typeof item!=='object')throw new RsvpError('Enter valid dietary restrictions.');
  const {guestId,restrictions}=item as Record<string,unknown>;
  if(typeof guestId!=='string'||!allowed.has(guestId)||seen.has(guestId))throw new RsvpError('Choose each invited guest only once.');
  if(typeof restrictions!=='string'||restrictions.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(restrictions))throw new RsvpError('Enter dietary restrictions of up to 500 characters.');
  seen.add(guestId);
  notes.push({guestId,restrictions:restrictions.trim()});
 }
 return notes;
}

export function validateNameCorrection(view:HouseholdView,guestId:unknown,value:unknown) {
 if(typeof value!=='string'||value.length>100||/[\u0000-\u001f\u007f]/.test(value))throw new RsvpError('Enter the corrected full name.');
 const correctedName=value.trim().replace(/\s+/g,' ');
 if(correctedName.length<2)throw new RsvpError('Enter the corrected full name.');
 const guest=view.events.flatMap(event=>event.guests).find(guest=>guest.id===guestId);
 if(!guest)throw new RsvpError('Choose a guest in your household.',404);
 if(guest.name===correctedName)throw new RsvpError('Enter a name that differs from the one on your invitation.');
 return {guestId:guest.id,previousName:guest.name,correctedName};
}

export function issueToken(householdId: string, purpose: 'choice' | 'session', secret: string, now = Math.floor(Date.now()/1000), lifetimeSeconds = 900): string {
 if (secret.length < 32) throw new RsvpError('RSVP is not configured yet.',503);
 const payload = Buffer.from(JSON.stringify({householdId,purpose,expires:now+lifetimeSeconds})).toString('base64url');
 const signature = createHmac('sha256',secret).update(payload).digest('base64url');
 return `${payload}.${signature}`;
}
export function verifyToken(token: unknown, purpose: 'choice' | 'session', secret: string, now = Math.floor(Date.now()/1000)): string | null {
 if (typeof token !== 'string' || token.length > 1000 || secret.length < 32) return null;
 const [payload,signature,...extra] = token.split('.');
 if (!payload || !signature || extra.length || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
 const expected = createHmac('sha256',secret).update(payload).digest('base64url');
 if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return null;
 let parsed: unknown;
 try { parsed = JSON.parse(Buffer.from(payload,'base64url').toString()); } catch { return null; }
 if (!parsed || typeof parsed !== 'object') return null;
 const claims = parsed as Record<string,unknown>;
 return claims.purpose === purpose && typeof claims.expires === 'number' && claims.expires > now && typeof claims.householdId === 'string' && /^[0-9a-f-]{36}$/i.test(claims.householdId) ? claims.householdId : null;
}
export function validateResponses(value: unknown, invitations: InvitationRecord[]): ResponseInput[] {
 if (!Array.isArray(value) || value.length === 0 || value.length > 500 || value.length !== invitations.length) throw new RsvpError('Please answer for every invited guest and event.');
 const allowed = new Set(invitations.map(invitation=>`${invitation.guest_id}:${invitation.event_id}`));
 const seen = new Set<string>();
 return value.map((item: unknown) => {
  if (!item || typeof item !== 'object') throw new RsvpError('Invalid RSVP answer.');
  const response = item as Record<string,unknown>;
  if (typeof response.guestId !== 'string' || typeof response.eventId !== 'string' || (response.attendance !== 'attending' && response.attendance !== 'declined')) throw new RsvpError('Choose attending or unable to attend for every guest.');
  const pair = `${response.guestId}:${response.eventId}`;
  if (!allowed.has(pair) || seen.has(pair)) throw new RsvpError('This answer does not match your invitation.');
  seen.add(pair);
  return {guestId:response.guestId,eventId:response.eventId,attendance:response.attendance};
 });
}
export function buildHouseholdView(household: {id:string;display_name:string}, guests: GuestRecord[], invitations: (InvitationRecord & {event:EventRecord})[], responses: (InvitationRecord & {attendance:string})[]): HouseholdView {
 const guestById = new Map(guests.map(guest=>[guest.id,guest]));
 const answerByPair = new Map(responses.map(response=>[`${response.guest_id}:${response.event_id}`,response.attendance]));
 const events = new Map<string,HouseholdView['events'][number]>();
 for (const invitation of invitations) {
  const guest = guestById.get(invitation.guest_id);
  if (!guest) continue;
  const event = invitation.event;
  if (!events.has(event.id)) events.set(event.id,{id:event.id,name:event.name,startsAt:event.starts_at,endsAt:event.ends_at,timeZone:event.time_zone,venue:event.venue_name,description:event.description,attire:event.attire,guests:[]});
  const answer = answerByPair.get(`${guest.id}:${event.id}`);
  events.get(event.id)!.guests.push({id:guest.id,name:guest.display_name,attendance:answer === 'attending' || answer === 'declined' ? answer : null});
 }
 const invitedGuests=[...new Set(invitations.map(invitation=>invitation.guest_id))].flatMap(id=>guestById.get(id)??[]).map(guest=>({id:guest.id,name:guest.display_name,dietaryRestrictions:guest.dietary_restrictions??null}));
 return {id:household.id,name:household.display_name,guests:invitedGuests,events:[...events.values()].sort((a,b)=>(a.startsAt??'9999').localeCompare(b.startsAt??'9999'))};
}

export function checkOrigin(request: Request) {
 const origin = request.headers.get('origin');
 const expectedOrigin = new URL(request.url);
 // Next may use an internal hostname; browsers send the public Host header.
 expectedOrigin.host = request.headers.get('host') ?? expectedOrigin.host;
 if ((origin && origin !== expectedOrigin.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new RsvpError('Please use the RSVP page to submit your response.',403);
}
export function requestRateKey(request:Request,scope:string,secret:string):string{
 if(secret.length<32)throw new RsvpError('The service is not configured yet.',503);
 const address=(request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown').slice(0,200);
 return scope+':'+createHmac('sha256',secret).update(address).digest('hex');
}
