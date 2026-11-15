BEGIN;
CREATE OR REPLACE FUNCTION public.admin_create_guests(p_household_id uuid,p_household_name text,p_guests jsonb,p_event_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE existing_name text;
BEGIN
 IF p_household_id IS NULL OR jsonb_typeof(p_guests) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid guest addition' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_guests) NOT BETWEEN 1 AND 20 OR cardinality(p_event_ids)>20 THEN RAISE EXCEPTION 'Invalid addition size' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_guests) AS g(id uuid,name text) WHERE id IS NULL OR name IS NULL OR length(btrim(name)) NOT BETWEEN 1 AND 300) THEN RAISE EXCEPTION 'Invalid guest name' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT id) FROM jsonb_to_recordset(p_guests) AS g(id uuid,name text))<>jsonb_array_length(p_guests)
 OR (SELECT count(DISTINCT lower(regexp_replace(btrim(name),'\s+',' ','g'))) FROM jsonb_to_recordset(p_guests) AS g(id uuid,name text))<>jsonb_array_length(p_guests) THEN RETURN jsonb_build_object('error','Each guest must be listed once.'); END IF;
 IF p_household_name IS NOT NULL AND length(btrim(p_household_name)) NOT BETWEEN 1 AND 300 THEN RETURN jsonb_build_object('error','Enter a household name.'); END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_event_ids) event_id WHERE NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id)) THEN RETURN jsonb_build_object('error','An event is no longer available. Please refresh.'); END IF;
 IF EXISTS(SELECT 1 FROM public.guests g JOIN jsonb_to_recordset(p_guests) AS incoming(id uuid,name text) ON incoming.id=g.id WHERE g.household_id<>p_household_id OR g.archived_at IS NOT NULL OR g.display_name<>btrim(incoming.name)) THEN RETURN jsonb_build_object('error','This addition changed. Please reload and try again.'); END IF;
 IF p_household_name IS NOT NULL THEN
  INSERT INTO public.households(id,display_name,mailing_status,grouping_needs_review) VALUES(p_household_id,btrim(p_household_name),'missing_address',false) ON CONFLICT(id) DO NOTHING;
 END IF;
 SELECT display_name INTO existing_name FROM public.households WHERE id=p_household_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('error','That household was not found.'); END IF;
 IF p_household_name IS NOT NULL AND existing_name<>btrim(p_household_name) THEN RETURN jsonb_build_object('error','This addition changed. Please reload and try again.'); END IF;
 IF EXISTS(SELECT 1 FROM public.guests g JOIN jsonb_to_recordset(p_guests) AS incoming(id uuid,name text) ON lower(regexp_replace(btrim(incoming.name),'\s+',' ','g'))=lower(regexp_replace(btrim(g.display_name),'\s+',' ','g')) WHERE g.household_id=p_household_id AND g.archived_at IS NULL AND g.id<>incoming.id) THEN RETURN jsonb_build_object('error','A guest with that name is already in this household.'); END IF;
 INSERT INTO public.guests(id,household_id,display_name)
 SELECT id,p_household_id,btrim(name) FROM jsonb_to_recordset(p_guests) AS g(id uuid,name text) ON CONFLICT(id) DO NOTHING;
 IF p_household_name IS NOT NULL THEN
  INSERT INTO public.invitations(guest_id,event_id,is_active,assignment_source,review_required)
  SELECT g.id,e.event_id,true,'admin',false FROM jsonb_to_recordset(p_guests) AS g(id uuid,name text) CROSS JOIN unnest(p_event_ids) AS e(event_id)
  ON CONFLICT(guest_id,event_id) DO NOTHING;
 ELSE
  INSERT INTO public.invitations(guest_id,event_id,is_active,assignment_source,review_required)
  SELECT incoming.id,i.event_id,true,'household-addition',bool_or(i.review_required)
  FROM jsonb_to_recordset(p_guests) AS incoming(id uuid,name text)
  CROSS JOIN public.invitations i JOIN public.guests member ON member.id=i.guest_id
  WHERE member.household_id=p_household_id AND member.archived_at IS NULL AND i.is_active GROUP BY incoming.id,i.event_id
  ON CONFLICT(guest_id,event_id) DO NOTHING;
 END IF;
 RETURN jsonb_build_object('householdId',p_household_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_guests(uuid,text,jsonb,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_guests(uuid,text,jsonb,uuid[]) TO service_role;
COMMIT;
