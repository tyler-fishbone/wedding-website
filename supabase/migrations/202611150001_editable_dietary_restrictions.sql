BEGIN;

-- A blank note now clears the guest's dietary restrictions, so guests can edit or remove them.
CREATE OR REPLACE FUNCTION public.save_household_dietary_restrictions(p_household_id uuid,p_notes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 updated_count integer;
BEGIN
 IF jsonb_typeof(p_notes) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Expected dietary notes' USING ERRCODE='22023';
 END IF;
 IF jsonb_array_length(p_notes) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Invalid dietary notes' USING ERRCODE='22023';
 END IF;

 UPDATE public.guests AS guest
 SET dietary_restrictions = NULLIF(btrim(note.restrictions),'')
 FROM jsonb_to_recordset(p_notes) AS note("guestId" uuid,restrictions text)
 WHERE guest.id = note."guestId"
   AND guest.household_id = p_household_id
   AND guest.archived_at IS NULL
   AND note.restrictions IS NOT NULL
   AND char_length(btrim(note.restrictions)) <= 500
   AND EXISTS (SELECT 1 FROM public.invitations WHERE guest_id=guest.id AND is_active);

 GET DIAGNOSTICS updated_count = ROW_COUNT;
 IF updated_count <> jsonb_array_length(p_notes) THEN
  RAISE EXCEPTION 'Dietary note outside invitation' USING ERRCODE='22023';
 END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_household_dietary_restrictions(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_household_dietary_restrictions(uuid,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
