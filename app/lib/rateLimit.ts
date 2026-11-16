import 'server-only';
import {requestRateKey,RsvpError} from './rsvp';
import {database} from './rsvpStore';
const policies={lookup:{limit:60,seconds:600},address:{limit:20,seconds:3600},nameCorrection:{limit:20,seconds:3600},admin:{limit:10,seconds:900}};
export async function enforceRateLimit(request:Request,scope:keyof typeof policies){
 const policy=policies[scope];
 const key=requestRateKey(request,scope,process.env.SUPABASE_SECRET_KEY??'');
 const allowed=await database<boolean>('rpc/consume_request_limit',{p_bucket:key,p_limit:policy.limit,p_window_seconds:policy.seconds});
 if(!allowed)throw new RsvpError('Too many requests. Please try again in a few minutes.',429);
}
