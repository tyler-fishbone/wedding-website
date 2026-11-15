BEGIN;
CREATE TABLE public.request_limits (
 bucket text PRIMARY KEY CHECK(length(bucket)<=100),
 window_start timestamptz NOT NULL,
 hits integer NOT NULL CHECK(hits>0)
);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.request_limits TO service_role;
CREATE OR REPLACE FUNCTION public.consume_request_limit(p_bucket text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_window timestamptz; request_count integer;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 1000 OR p_window_seconds NOT BETWEEN 1 AND 86400 OR length(p_bucket)>100
 THEN RAISE EXCEPTION 'Invalid request limit' USING ERRCODE='22023'; END IF;
 current_window:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/p_window_seconds)*p_window_seconds);
 INSERT INTO public.request_limits(bucket,window_start,hits) VALUES(p_bucket,current_window,1)
 ON CONFLICT(bucket) DO UPDATE SET window_start=EXCLUDED.window_start,
 hits=CASE WHEN request_limits.window_start=EXCLUDED.window_start THEN least(request_limits.hits+1,p_limit+1) ELSE 1 END
 RETURNING hits INTO request_count;
 RETURN request_count<=p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_request_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(text,integer,integer) TO service_role;
COMMIT;
