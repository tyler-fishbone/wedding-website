import {wedding} from '../../content/wedding';
import {buildAppleCalendarFile,calendarLocation} from '../../lib/calendar';
import {loadSchedule} from '../../lib/scheduleStore';
import {enforceRateLimit} from '../../lib/rateLimit';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkOrigin, issueToken, normalizeLookup, RsvpError, validateDietaryRestrictions, validateNameCorrection, validateResponses, verifyToken } from '../../lib/rsvp';
import { findHouseholds, loadHousehold, rsvpConfig, saveDietaryRestrictions, saveNameCorrection, saveResponses } from '../../lib/rsvpStore';

export const runtime = 'nodejs';
const cookieName = 'wedding-rsvp';
const sessionSeconds = 7 * 24 * 60 * 60;
function json(body: unknown, status = 200) { return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}}); }
function fail(error: unknown) {
 if (error instanceof RsvpError) return json({error:error.message},error.status);
 console.error('RSVP operation failed',error instanceof Error?error.name:'Unknown error');
 return json({error:'We couldn’t complete that request. Please try again.'},500);
}
async function householdSession() {
 const {sessionSecret} = rsvpConfig();
 const householdId = verifyToken((await cookies()).get(cookieName)?.value,'session',sessionSecret);
 if (!householdId) throw new RsvpError('Please find your invitation again.',401);
 return householdId;
}
async function householdPayload(householdId:string,request:Request) {
 const {view}=await loadHousehold(householdId);
 return {household:view,...(new URL(request.url).searchParams.get('view')==='schedule'?{schedule:await loadSchedule(view)}:{})};
}
async function appleCalendar(householdId:string,eventId:string) {
 const {view}=await loadHousehold(householdId);
 const invitation=view.events.find(event=>event.id===eventId);
 if(!invitation?.startsAt||!invitation.endsAt)throw new RsvpError('Calendar details are not available for that event.',404);
 const event=(await loadSchedule({...view,events:[invitation]}))[0];
 if(!event)throw new RsvpError('Calendar details are not available for that event.',404);
 const filename=event.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'wedding-event';
 const calendar=buildAppleCalendarFile({
  id:event.id,title:wedding.couple+': '+event.name,startsAt:invitation.startsAt,endsAt:invitation.endsAt,
  location:calendarLocation(event),details:event.description||(!event.address&&!invitation.venue?'Location to be announced.':'')
 });
 return new Response(calendar,{headers:{
  'Content-Type':'text/calendar; charset=utf-8',
  'Content-Disposition':'attachment; filename="'+filename+'.ics"',
  'Cache-Control':'private, no-store'
 }});
}
export async function GET(request:Request) {
 try {
  const householdId=await householdSession();
  const eventId=new URL(request.url).searchParams.get('calendar');
  return eventId?await appleCalendar(householdId,eventId):json(await householdPayload(householdId,request));
 } catch(error) { return fail(error); }
}
export async function POST(request: Request) {
 try {
  checkOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new RsvpError('Invalid request.');
  if (Number(request.headers.get('content-length')) > 20000) throw new RsvpError('Request is too large.',413);
  const text = await request.text();
  if (text.length > 20000) throw new RsvpError('Request is too large.',413);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new RsvpError('Invalid request.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new RsvpError('Invalid request.');
  const body = parsed as Record<string,unknown>;
  const {sessionSecret} = rsvpConfig();
  if (body.action === 'lookup') {
   const query = normalizeLookup(body.query,body.mode);
   await enforceRateLimit(request,'lookup');
   const matches = await findHouseholds(query,body.mode as 'name'|'email');
   return json({matches:matches.map(match=>({name:match.display_name,guestNames:match.guest_names,token:issueToken(match.id,'choice',sessionSecret)}))});
  }
  if (body.action === 'confirm') {
   const householdId = verifyToken(body.token,'choice',sessionSecret);
   if (!householdId) throw new RsvpError('Your lookup expired. Please find your invitation again.',401);
   const response = json(await householdPayload(householdId,request));
   response.cookies.set(cookieName,issueToken(householdId,'session',sessionSecret,undefined,sessionSeconds),{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/api/rsvp',maxAge:sessionSeconds});
   return response;
  }
  if (body.action === 'request-name-correction') {
   const householdId = await householdSession();
   await enforceRateLimit(request,'nameCorrection');
   const {view} = await loadHousehold(householdId);
   await saveNameCorrection(householdId,validateNameCorrection(view,body.guestId,body.correctedName));
   return json({ok:true});
  }
  if (body.action === 'save') {
   const householdId = await householdSession();
   const {invitations} = await loadHousehold(householdId);
   const responses = validateResponses(body.responses,invitations);
   const notes = body.dietaryRestrictions===undefined?[]:validateDietaryRestrictions(body.dietaryRestrictions,invitations);
   await saveResponses(householdId,responses);
   if(notes.length)await saveDietaryRestrictions(householdId,notes);
   const {view} = await loadHousehold(householdId);
   return json({household:view});
  }
  throw new RsvpError('Invalid request.');
 } catch(error) { return fail(error); }
}
export async function DELETE(request: Request) {
 try { checkOrigin(request); const response = json({ok:true}); response.cookies.set(cookieName,'',{httpOnly:true,sameSite:'lax',path:'/api/rsvp',maxAge:0}); return response; } catch(error) { return fail(error); }
}
