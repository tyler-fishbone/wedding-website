BEGIN;
CREATE OR REPLACE FUNCTION public.save_household_rsvp(p_household_id uuid,p_responses jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE expected_count integer; received_count integer;
BEGIN
 PERFORM 1 FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown household' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_responses) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expected answers' USING ERRCODE='22023'; END IF;
 -- Lock invitation rows as well: a concurrent household move can change which household an admin locks.
 PERFORM i.guest_id FROM public.invitations i JOIN public.guests g ON g.id=i.guest_id
 WHERE g.household_id=p_household_id AND i.is_active
 ORDER BY i.guest_id,i.event_id FOR UPDATE OF i;
 received_count := jsonb_array_length(p_responses);
 SELECT count(*) INTO expected_count FROM public.invitations i JOIN public.guests g ON g.id=i.guest_id WHERE g.household_id=p_household_id AND i.is_active;
 IF received_count=0 OR received_count>500 OR received_count<>expected_count THEN RAISE EXCEPTION 'Incomplete answers' USING ERRCODE='22023'; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset(p_responses) AS r("guestId" uuid,"eventId" uuid,attendance text)
  LEFT JOIN public.guests g ON g.id=r."guestId" AND g.household_id=p_household_id
  LEFT JOIN public.invitations i ON i.guest_id=r."guestId" AND i.event_id=r."eventId" AND i.is_active
  WHERE g.id IS NULL OR i.guest_id IS NULL OR r.attendance IS NULL OR r.attendance NOT IN ('attending','declined')
 ) THEN RAISE EXCEPTION 'Answer outside invitation' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT (r."guestId",r."eventId")) FROM jsonb_to_recordset(p_responses) AS r("guestId" uuid,"eventId" uuid,attendance text)) <> received_count THEN RAISE EXCEPTION 'Duplicate answers' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rsvp_responses(guest_id,event_id,attendance,responded_at)
 SELECT r."guestId",r."eventId",r.attendance,now() FROM jsonb_to_recordset(p_responses) AS r("guestId" uuid,"eventId" uuid,attendance text)
 ON CONFLICT(guest_id,event_id) DO UPDATE SET attendance=EXCLUDED.attendance,responded_at=EXCLUDED.responded_at;
END;
$$;
REVOKE ALL ON FUNCTION public.save_household_rsvp(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_household_rsvp(uuid,jsonb) TO service_role;

COMMIT;
