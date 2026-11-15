BEGIN;
DO $$
DECLARE h uuid:=gen_random_uuid(); other_h uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); rejected boolean:=false;
BEGIN
 INSERT INTO public.households(id,display_name) VALUES(h,'Transaction-only test'),(other_h,'Transaction-only destination');
 INSERT INTO public.guests(id,household_id,display_name) VALUES(a,h,'Test A'),(b,h,'Test B'),(c,other_h,'Test C');
 INSERT INTO public.events(id,slug,name) VALUES(e,'transaction-only-'||e,'Transaction-only event');
 IF NOT public.admin_set_household_invitation(h,e,true) THEN RAISE EXCEPTION 'Invite failed'; END IF;
 IF (SELECT count(*) FROM public.invitations WHERE event_id=e AND is_active)<>2 THEN RAISE EXCEPTION 'Must invite both household members'; END IF;
 INSERT INTO public.rsvp_responses(guest_id,event_id,attendance) VALUES(a,e,'attending'),(b,e,'declined');
 PERFORM public.admin_set_household_invitation(h,e,false);
 IF EXISTS(SELECT 1 FROM public.invitations WHERE event_id=e AND is_active) THEN RAISE EXCEPTION 'Remove must affect everyone'; END IF;
 IF (SELECT count(*) FROM public.rsvp_responses WHERE event_id=e)<>2 THEN RAISE EXCEPTION 'Lost answers'; END IF;
 BEGIN
  PERFORM public.save_household_rsvp(h,jsonb_build_array(jsonb_build_object('guestId',a,'eventId',e,'attendance','attending'),jsonb_build_object('guestId',b,'eventId',e,'attendance','declined')));
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Accepted stale RSVP'; END IF;
 PERFORM public.admin_set_household_invitation(h,e,true);
 IF (SELECT attendance FROM public.rsvp_responses WHERE guest_id=b AND event_id=e)<>'declined' THEN RAISE EXCEPTION 'Lost individual answer'; END IF;
 PERFORM public.admin_set_household_invitation(other_h,e,true);
 IF NOT public.admin_move_guest(a,other_h) THEN RAISE EXCEPTION 'Move failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.guests WHERE id=a AND household_id=other_h) THEN RAISE EXCEPTION 'Wrong destination'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.invitations WHERE guest_id=a AND event_id=e AND is_active) THEN RAISE EXCEPTION 'Moved member invitations inconsistent'; END IF;
 IF public.admin_set_household_invitation(gen_random_uuid(),e,true) THEN RAISE EXCEPTION 'Accepted missing household'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: household invite/remove/reinvite, individual answer preservation, stale RSVP rejection and household move; test data rolled back' AS result;
