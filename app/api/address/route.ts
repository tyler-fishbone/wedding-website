import {enforceRateLimit} from '../../lib/rateLimit';
import {NextResponse} from 'next/server';
import {AddressValidationError,validateAddressPayload} from '../../lib/address';
import {checkOrigin,RsvpError} from '../../lib/rsvp';
import {database} from '../../lib/rsvpStore';
export const runtime='nodejs';
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 try{
  checkOrigin(request);
  if(!request.headers.get('content-type')?.includes('application/json'))throw new AddressValidationError('Invalid submission.');
  if(Number(request.headers.get('content-length'))>20000)return json({ok:false,error:'Submission is too large.'},413);
  const text=await request.text();if(text.length>20000)return json({ok:false,error:'Submission is too large.'},413);
  let body:unknown;try{body=JSON.parse(text);}catch{throw new AddressValidationError('Invalid submission.');}
  const payload=validateAddressPayload(body);
  await enforceRateLimit(request,'address');
  await database('rpc/save_address_submission',{p_submission_id:payload.submissionId,p_payload:payload});
  return json({ok:true});
 }catch(error){
  if(error instanceof AddressValidationError)return json({ok:false,error:error.message},400);
  if(error instanceof RsvpError&&error.status===429)return json({ok:false,error:error.message},429);
  if(error instanceof RsvpError&&error.status===403)return json({ok:false,error:'Please submit from the address form.'},403);
  return json({ok:false,error:'We couldn’t save your address. Please try again.'},503);
 }
}
