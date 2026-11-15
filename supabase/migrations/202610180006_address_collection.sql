BEGIN;
CREATE TABLE public.address_submissions (
 id uuid PRIMARY KEY,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied')),
 household_id uuid REFERENCES public.households(id),
 review_reason text,
 received_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz
);
ALTER TABLE public.address_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.address_submissions FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.address_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.apply_address_submission(p_submission_id uuid,p_household_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE submission public.address_submissions%ROWTYPE;
BEGIN
 SELECT * INTO submission FROM public.address_submissions WHERE id=p_submission_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Repeating a successful request must not overwrite a newer address.
 IF submission.status='applied' THEN RETURN submission.household_id=p_household_id; END IF;
 UPDATE public.households SET
 contact_email=submission.payload->>'email',phone=submission.payload->>'phone',
 address_line_1=submission.payload->>'address1',address_line_2=nullif(submission.payload->>'address2',''),
 city=submission.payload->>'city',region=nullif(submission.payload->>'state',''),
 postal_code=nullif(submission.payload->>'zip',''),country_code=submission.payload->>'countryCode',
 mailing_status=CASE WHEN mailing_status='on_hold' THEN 'on_hold' ELSE 'ready' END,
 updated_at=now()
 WHERE id=p_household_id;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.address_submissions SET status='applied',household_id=p_household_id,applied_at=now(),review_reason=NULL WHERE id=p_submission_id;
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_address_submission(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_address_submission(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.save_address_submission(p_submission_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE inserted_id uuid; previous public.address_submissions%ROWTYPE; candidates uuid[]; target uuid;
BEGIN
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
 OR coalesce(btrim(p_payload->>'firstName1'),'')='' OR coalesce(btrim(p_payload->>'lastName1'),'')=''
 OR coalesce(btrim(p_payload->>'email'),'')='' OR coalesce(btrim(p_payload->>'phone'),'')=''
 OR coalesce(btrim(p_payload->>'address1'),'')='' OR coalesce(btrim(p_payload->>'city'),'')=''
 OR coalesce(p_payload->>'countryCode','') !~ '^[A-Z]{2}$'
 THEN RAISE EXCEPTION 'Invalid address submission' USING ERRCODE='22023'; END IF;
 INSERT INTO public.address_submissions(id,payload) VALUES(p_submission_id,p_payload) ON CONFLICT(id) DO NOTHING RETURNING id INTO inserted_id;
 IF inserted_id IS NULL THEN
  SELECT * INTO previous FROM public.address_submissions WHERE id=p_submission_id FOR UPDATE;
  IF (previous.payload-'submittedAt'-'userAgent'-'pageUrl'-'referrer') IS DISTINCT FROM (p_payload-'submittedAt'-'userAgent'-'pageUrl'-'referrer')
  THEN RAISE EXCEPTION 'Submission identifier reused for different details' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('submissionId',previous.id,'status',previous.status);
 END IF;
 -- Intersect all nonempty evidence sets. Conflicting names/email never choose one household by priority.
 WITH evidence AS (
  SELECT g.household_id,'name1' AS source FROM public.guests g
  WHERE lower(regexp_replace(btrim(g.display_name),'\s+',' ','g'))=lower(regexp_replace(btrim((p_payload->>'firstName1')||' '||(p_payload->>'lastName1')),'\s+',' ','g'))
  UNION
  SELECT g.household_id,'name2' FROM public.guests g
  WHERE coalesce(p_payload->>'firstName2','')<>'' AND lower(regexp_replace(btrim(g.display_name),'\s+',' ','g'))=lower(regexp_replace(btrim((p_payload->>'firstName2')||' '||(p_payload->>'lastName2')),'\s+',' ','g'))
  UNION
  SELECT h.id,'email' FROM public.households h
  WHERE lower(btrim(h.contact_email))=lower(btrim(p_payload->>'email'))
  UNION
  SELECT g.household_id,'email' FROM public.guests g
  WHERE lower(btrim(g.email))=lower(btrim(p_payload->>'email'))
 ), matches AS (
  SELECT household_id FROM evidence GROUP BY household_id HAVING count(DISTINCT source)=(SELECT count(DISTINCT source) FROM evidence)
 ) SELECT array_agg(household_id) INTO candidates FROM matches;
 IF cardinality(candidates)=1 THEN
  target:=candidates[1];
  IF NOT public.apply_address_submission(p_submission_id,target) THEN RAISE EXCEPTION 'Household disappeared' USING ERRCODE='22023'; END IF;
 ELSE
  UPDATE public.address_submissions SET review_reason='No single consistent household match. Please confirm the household before applying these details.' WHERE id=p_submission_id;
 END IF;
 RETURN (SELECT jsonb_build_object('submissionId',id,'status',status) FROM public.address_submissions WHERE id=p_submission_id);
END;
$$;
REVOKE ALL ON FUNCTION public.save_address_submission(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_address_submission(uuid,jsonb) TO service_role;
COMMIT;
