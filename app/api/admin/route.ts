import {enforceRateLimit} from '../../lib/rateLimit';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {buildAdminOverview,validateAdminCreate,buildHouseholdList,validateHouseholdInvitationChange,validateAdminEdit,validateInvitationChange,isUuid,matchesAdminPassphrase,issueAdminSession,verifyAdminSession,type AdminHousehold,type AdminGuest,type AdminInvitation,type AdminResponse,type PlanningIssue,type AddressSubmission} from '../../lib/admin';
import {checkOrigin,RsvpError} from '../../lib/rsvp';
import {database} from '../../lib/rsvpStore';

export const runtime='nodejs';
const adminCookie='wedding-admin';
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function fail(error:unknown){return error instanceof RsvpError?json({error:error.message},error.status):json({error:'We couldn’t load wedding planning. Please try again.'},500);}
function config(){
 const passphrase=process.env.RSVP_ADMIN_PASSPHRASE??'';const secret=process.env.RSVP_SESSION_SECRET??'';
 if(!passphrase||secret.length<32)throw new RsvpError('Admin sign-in has not been configured yet.',503);
 return {passphrase,secret};
}
async function requireAdmin(){
 const {passphrase,secret}=config();
 if(!verifyAdminSession((await cookies()).get(adminCookie)?.value,passphrase,secret))throw new RsvpError('Please sign in to wedding planning.',401);
}
export async function GET(request:Request){
 try{
  await requireAdmin();
  const query=new URL(request.url).searchParams;
  const householdId=query.get('householdId');const list=query.get('scope')==='list';
  if(householdId&&!isUuid(householdId))throw new RsvpError('Invalid household.');
  const householdFilter=householdId?`&id=eq.${householdId}`:'';
  const guestFilter=householdId?`&household_id=eq.${householdId}`:'';
  const scopedGuests=householdId?await database<AdminGuest[]>(`guests?archived_at=is.null&select=id,household_id,display_name,email,is_family,dietary_restrictions&order=display_name${guestFilter}`):null;
  const invitationFilter=scopedGuests?`&guest_id=in.(${scopedGuests.map(guest=>guest.id).join(',')||'00000000-0000-4000-8000-000000000000'})`:'';
  const [households,guests,events,invitations,responses,issues,addressSubmissions]=await Promise.all([
   database<AdminHousehold[]>(`households?select=id,display_name,contact_email,phone,address_line_1,address_line_2,city,region,postal_code,country_code,mailing_status,grouping_needs_review&order=display_name${householdFilter}`),
   scopedGuests?Promise.resolve(scopedGuests):database<AdminGuest[]>(`guests?archived_at=is.null&select=id,household_id,display_name,email,is_family&order=display_name${guestFilter}`),
   database<{id:string;name:string}[]>('events?select=id,name&order=starts_at&slug=not.in.(family-shabbarbeque,family-shabbarbecue)'),
   database<AdminInvitation[]>(`invitations?select=guest_id,event_id,review_required,assignment_source,is_active${invitationFilter}`),
   database<AdminResponse[]>(`rsvp_responses?select=guest_id,event_id,attendance${invitationFilter}`),
   list?Promise.resolve([]):database<PlanningIssue[]>(`planning_issues?select=id,subject,detail,household_id,resolved_at&resolved_at=is.null&order=created_at${householdId?`&household_id=eq.${householdId}`:''}`),
   list||householdId?Promise.resolve([]):database<AddressSubmission[]>('address_submissions?select=id,payload,household_id,review_reason,received_at&status=eq.pending&order=received_at')
  ]);
  // The deterministic fixture remains available for local regression checks, outside the planning list.
  const demoHouseholds=new Set(['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002']);
  const planningHouseholds=households.filter(household=>!demoHouseholds.has(household.id));
  const planningGuests=guests.filter(guest=>!demoHouseholds.has(guest.household_id));
  const guestIds=new Set(planningGuests.map(guest=>guest.id));
  const planningEvents=events.filter(event=>!['30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002'].includes(event.id));
  const planningInvitations=invitations.filter(invite=>guestIds.has(invite.guest_id));
  if(list)return json({householdList:buildHouseholdList(planningHouseholds,planningGuests,planningEvents,planningInvitations,responses)});
  const householdChoices=householdId?await database<Pick<AdminHousehold,'id'|'display_name'>[]>('households?select=id,display_name&order=display_name').then(choices=>choices.filter(household=>!demoHouseholds.has(household.id))):planningHouseholds;
  return json({overview:{householdChoices,...buildAdminOverview(planningHouseholds,planningGuests,planningEvents,planningInvitations,responses,issues),addressSubmissions}});
 }catch(error){return fail(error);}
}
export async function POST(request:Request){
 try{
  checkOrigin(request);
  await enforceRateLimit(request,'admin');
  const {passphrase,secret}=config();
  const text=await request.text();if(text.length>2000)throw new RsvpError('Invalid sign-in request.');
  let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new RsvpError('Invalid sign-in request.');}
  if(!parsed||typeof parsed!=='object'||!matchesAdminPassphrase((parsed as Record<string,unknown>).passphrase,passphrase))throw new RsvpError('That passphrase didn’t match.',401);
  const response=json({ok:true});response.cookies.set(adminCookie,issueAdminSession(passphrase,secret),{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/api/admin',maxAge:8*60*60});return response;
 }catch(error){return fail(error);}
}
export async function DELETE(request:Request){try{checkOrigin(request);const response=json({ok:true});response.cookies.set(adminCookie,'',{httpOnly:true,sameSite:'lax',path:'/api/admin',maxAge:0});return response;}catch(error){return fail(error);}}

export async function PATCH(request:Request){
 try{
  checkOrigin(request);await requireAdmin();
  const text=await request.text();if(text.length>12000)throw new RsvpError('Edit is too large.');
  let body:unknown;try{body=JSON.parse(text);}catch{throw new RsvpError('Invalid edit.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new RsvpError('Invalid edit.');
  const fields=body as Record<string,unknown>;
  let updated:unknown[];
  if(fields.kind==='create-household'||fields.kind==='add-guests'){
   const addition=validateAdminCreate(body);
   const result=await database<{householdId?:string;error?:string}>('rpc/admin_create_guests',{p_household_id:addition.householdId,p_household_name:addition.householdName,p_guests:addition.guests,p_event_ids:addition.eventIds});
   if(result.error)throw new RsvpError(result.error,409);
   if(!result.householdId)throw new RsvpError('The addition could not be saved.',503);
   return json({householdId:result.householdId},201);
  }else if(fields.kind==='apply-address'){
   if(!isUuid(fields.submissionId)||!isUuid(fields.householdId)||Object.keys(fields).some(field=>!['kind','submissionId','householdId'].includes(field)))throw new RsvpError('Choose a submission and household.');
   const applied=await database<boolean>('rpc/apply_address_submission',{p_submission_id:fields.submissionId,p_household_id:fields.householdId});
   if(!applied)throw new RsvpError('That submission or household is unavailable. Please refresh and try again.',409);
   return json({ok:true});
  }else if(fields.kind==='set-household-invitation'){
   const edit=validateHouseholdInvitationChange(body);
   const found=await database<boolean>('rpc/admin_set_household_invitation',{p_household_id:edit.householdId,p_event_id:edit.eventId,p_is_active:edit.active});
   if(!found)throw new RsvpError('That household or event was not found.',404);
   return json({ok:true});
  }else if(fields.kind==='set-invitation'){
   const edit=validateInvitationChange(body);
   const guests=await database<AdminGuest[]>(`guests?archived_at=is.null&id=eq.${edit.guestId}&select=id,household_id`);
   if(!guests[0])throw new RsvpError('That guest was not found.',404);
   const found=await database<boolean>('rpc/admin_set_household_invitation',{p_household_id:guests[0].household_id,p_event_id:edit.eventId,p_is_active:edit.active});
   if(!found)throw new RsvpError('That guest or event was not found.',404);
   return json({ok:true});
  }else if(fields.kind==='confirm-invitation'){
   if(!isUuid(fields.guestId)||!isUuid(fields.eventId)||Object.keys(fields).some(field=>!['kind','guestId','eventId'].includes(field)))throw new RsvpError('Invalid invitation.');
   updated=await database<unknown[]>(`invitations?guest_id=eq.${fields.guestId}&event_id=eq.${fields.eventId}`,{review_required:false},'PATCH');
  }else if(fields.kind==='resolve-issue'){
   if(!isUuid(fields.id)||Object.keys(fields).some(field=>!['kind','id'].includes(field)))throw new RsvpError('Invalid issue.');
   updated=await database<unknown[]>(`planning_issues?id=eq.${fields.id}`,{resolved_at:new Date().toISOString()},'PATCH');
  }else{
   const edit=validateAdminEdit(body);
   if(edit.table==='guests'&&typeof edit.values.household_id==='string'){
    const moved=await database<boolean>('rpc/admin_move_guest',{p_guest_id:edit.id,p_household_id:edit.values.household_id});
    if(!moved)throw new RsvpError('That guest or household was not found.',404);
    delete edit.values.household_id;
    if(!Object.keys(edit.values).length)return json({ok:true});
   }
   updated=await database<unknown[]>(`${edit.table}?id=eq.${edit.id}`,edit.values,'PATCH');
  }
  if(!updated.length)throw new RsvpError('That record was not found.',404);
  return json({ok:true});
 }catch(error){return fail(error);}
}
