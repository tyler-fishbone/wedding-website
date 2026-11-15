BEGIN;
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS mailing_status text NOT NULL DEFAULT 'unreviewed'
 CHECK (mailing_status IN ('ready','missing_address','on_hold','unreviewed'));
ALTER TABLE public.households ADD COLUMN IF NOT EXISTS grouping_needs_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS is_family boolean;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS assignment_source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS review_required boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.import_source_records (
 source_key text PRIMARY KEY,
 source_tab text NOT NULL,
 source_row integer NOT NULL,
 payload jsonb NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.planning_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_key text NOT NULL UNIQUE,
 subject text NOT NULL,
 detail text NOT NULL,
 household_id uuid REFERENCES public.households(id),
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.import_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_source_records,public.planning_issues FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.households,public.guests,public.events,public.invitations,public.import_source_records,public.planning_issues TO service_role;
COMMIT;
