BEGIN;
CREATE OR REPLACE FUNCTION public.admin_set_household_invitation(p_household_id uuid,p_event_id uuid,p_is_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_is_active IS NULL THEN RAISE EXCEPTION 'Expected invitation status' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event_id) THEN RETURN false; END IF;
 PERFORM id FROM public.guests WHERE household_id=p_household_id ORDER BY id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.invitations(guest_id,event_id,is_active,assignment_source,review_required)
 SELECT id,p_event_id,p_is_active,'admin',false FROM public.guests WHERE household_id=p_household_id
 ON CONFLICT(guest_id,event_id) DO UPDATE SET is_active=EXCLUDED.is_active,assignment_source=EXCLUDED.assignment_source,review_required=false;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_household_invitation(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_household_invitation(uuid,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_move_guest(p_guest_id uuid,p_household_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE previous_household uuid;
BEGIN
 SELECT household_id INTO previous_household FROM public.guests WHERE id=p_guest_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM id FROM public.households WHERE id IN(previous_household,p_household_id) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.households WHERE id=p_household_id) THEN RETURN false; END IF;
 PERFORM id FROM public.guests WHERE id=p_guest_id AND household_id=previous_household FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Guest changed household; refresh and try again' USING ERRCODE='40001'; END IF;
 IF previous_household=p_household_id THEN RETURN true; END IF;
 -- Match destination invitations while retaining each person's saved answers.
 UPDATE public.invitations SET is_active=false WHERE guest_id=p_guest_id;
 INSERT INTO public.invitations(guest_id,event_id,is_active,assignment_source,review_required)
 SELECT p_guest_id,i.event_id,true,'household-move',bool_or(i.review_required)
 FROM public.invitations i JOIN public.guests g ON g.id=i.guest_id
 WHERE g.household_id=p_household_id AND i.is_active GROUP BY i.event_id
 ON CONFLICT(guest_id,event_id) DO UPDATE SET is_active=true,assignment_source=EXCLUDED.assignment_source,review_required=EXCLUDED.review_required;
 UPDATE public.guests SET household_id=p_household_id WHERE id=p_guest_id;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_move_guest(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_move_guest(uuid,uuid) TO service_role;
COMMIT;
