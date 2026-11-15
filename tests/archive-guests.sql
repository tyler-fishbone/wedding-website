BEGIN;
DO $$
DECLARE h uuid:=gen_random_uuid(); active_guest uuid:=gen_random_uuid(); archived_guest uuid:=gen_random_uuid(); event_id uuid:=gen_random_uuid(); matched_names text[];
BEGIN
 INSERT INTO public.households(id,display_name) VALUES(h,'Archive regression household');
 INSERT INTO public.guests(id,household_id,display_name,archived_at) VALUES(active_guest,h,'Active Archive Test',NULL),(archived_guest,h,'Retired Archive Test',now());
 INSERT INTO public.events(id,slug,name) VALUES(event_id,'archive-regression-'||event_id,'Archive regression event');
 PERFORM public.admin_set_household_invitation(h,event_id,true);
 IF EXISTS(SELECT 1 FROM public.invitations WHERE guest_id=archived_guest AND is_active) THEN RAISE EXCEPTION 'Archived guest was reinvited'; END IF;
 IF EXISTS(SELECT 1 FROM public.find_rsvp_households('retired archive test','name')) THEN RAISE EXCEPTION 'Archived guest matched lookup'; END IF;
 SELECT guest_names INTO matched_names FROM public.find_rsvp_households('active archive test','name');
 IF matched_names IS DISTINCT FROM ARRAY['Active Archive Test'] THEN RAISE EXCEPTION 'Archived guest leaked into household names'; END IF;
 IF public.admin_move_guest(archived_guest,h) THEN RAISE EXCEPTION 'Archived guest can still be moved'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: archived guests stay out of lookup, household names, invitations and moves; fixtures rolled back' AS result;
