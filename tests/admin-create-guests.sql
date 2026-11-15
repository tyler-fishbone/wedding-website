BEGIN;
DO $$
DECLARE h uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); result jsonb; initial_count integer;
BEGIN
 INSERT INTO public.events(id,slug,name) VALUES(e,'create-test-'||e,'Create regression event');
 result:=public.admin_create_guests(h,'Create regression household',jsonb_build_array(jsonb_build_object('id',a,'name','Test A'),jsonb_build_object('id',b,'name','Test B')),ARRAY[e]);
 IF result->>'householdId' IS DISTINCT FROM h::text THEN RAISE EXCEPTION 'Household creation failed: %',result; END IF;
 IF (SELECT count(*) FROM public.invitations WHERE event_id=e AND is_active)<>2 THEN RAISE EXCEPTION 'Missing initial invitations'; END IF;
 INSERT INTO public.rsvp_responses(guest_id,event_id,attendance) VALUES(a,e,'declined');
 PERFORM public.admin_create_guests(h,'Create regression household',jsonb_build_array(jsonb_build_object('id',a,'name','Test A'),jsonb_build_object('id',b,'name','Test B')),ARRAY[e]);
 IF (SELECT count(*) FROM public.guests WHERE household_id=h)<>2 THEN RAISE EXCEPTION 'Retry duplicated guests'; END IF;
 UPDATE public.invitations SET review_required=true WHERE event_id=e;
 result:=public.admin_create_guests(h,NULL,jsonb_build_array(jsonb_build_object('id',c,'name','Test C')),ARRAY[]::uuid[]);
 IF result->>'householdId' IS DISTINCT FROM h::text THEN RAISE EXCEPTION 'Add guest failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.invitations WHERE guest_id=c AND event_id=e AND is_active AND review_required) THEN RAISE EXCEPTION 'New guest did not inherit invitation and review status'; END IF;
 IF (SELECT attendance FROM public.rsvp_responses WHERE guest_id=a AND event_id=e)<>'declined' THEN RAISE EXCEPTION 'Changed existing answer'; END IF;
 result:=public.admin_create_guests(h,NULL,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name','Test C')),ARRAY[]::uuid[]);
 IF result->>'error' IS NULL THEN RAISE EXCEPTION 'Accepted duplicate guest'; END IF;
 SELECT count(*) INTO initial_count FROM public.households;
 result:=public.admin_create_guests(gen_random_uuid(),'Invalid event household',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'name','Test D')),ARRAY[gen_random_uuid()]);
 IF result->>'error' IS NULL OR (SELECT count(*) FROM public.households)<>initial_count THEN RAISE EXCEPTION 'Invalid event left partial household'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: new household + guests + invitations, retries, inherited invitations, duplicate rejection, existing answers and atomic validation; fixtures rolled back' AS result;
