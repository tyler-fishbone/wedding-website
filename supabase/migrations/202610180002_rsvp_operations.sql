BEGIN;
GRANT SELECT ON public.households, public.guests, public.events, public.invitations, public.rsvp_responses TO service_role;
GRANT INSERT, UPDATE ON public.rsvp_responses TO service_role;
-- The household row lock serializes submissions and requires UPDATE privilege.
GRANT UPDATE ON public.households TO service_role;

CREATE OR REPLACE FUNCTION public.find_rsvp_households(p_query text, p_mode text)
RETURNS TABLE (id uuid, display_name text, guest_names text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT h.id, h.display_name,
   ARRAY(SELECT g.display_name FROM public.guests g WHERE g.household_id=h.id ORDER BY g.display_name)
 FROM public.households h
 WHERE length(p_query) BETWEEN 2 AND 200
 AND EXISTS (SELECT 1 FROM public.guests g JOIN public.invitations i ON i.guest_id=g.id WHERE g.household_id=h.id)
 AND (
  (p_mode='name' AND EXISTS (SELECT 1 FROM public.guests g WHERE g.household_id=h.id AND lower(regexp_replace(btrim(g.display_name),'\s+',' ','g'))=p_query))
  OR (p_mode='email' AND (lower(btrim(h.contact_email))=p_query OR EXISTS (SELECT 1 FROM public.guests g WHERE g.household_id=h.id AND lower(btrim(g.email))=p_query)))
 )
 ORDER BY h.display_name, h.id LIMIT 11;
$$;
REVOKE ALL ON FUNCTION public.find_rsvp_households(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_rsvp_households(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.save_household_rsvp(p_household_id uuid,p_responses jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE expected_count integer; received_count integer;
BEGIN
 PERFORM 1 FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown household' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_responses) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expected answers' USING ERRCODE='22023'; END IF;
 received_count := jsonb_array_length(p_responses);
 SELECT count(*) INTO expected_count FROM public.invitations i JOIN public.guests g ON g.id=i.guest_id WHERE g.household_id=p_household_id;
 IF received_count=0 OR received_count>500 OR received_count<>expected_count THEN RAISE EXCEPTION 'Incomplete answers' USING ERRCODE='22023'; END IF;
 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset(p_responses) AS r("guestId" uuid,"eventId" uuid,attendance text)
  LEFT JOIN public.guests g ON g.id=r."guestId" AND g.household_id=p_household_id
  LEFT JOIN public.invitations i ON i.guest_id=r."guestId" AND i.event_id=r."eventId"
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
