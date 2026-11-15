BEGIN;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug = 'wedding') THEN
  RAISE EXCEPTION 'Wedding event must exist before inviting wedding guests to brunch';
 END IF;
END;
$$;

INSERT INTO public.events (slug, name, time_zone, description)
VALUES ('farewell-brunch', 'Farewell Brunch', 'America/Chicago',
 'Monday morning, April 5, 2027. Exact time and location to be announced.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.invitations (guest_id, event_id, is_active, assignment_source, review_required)
SELECT wedding_invite.guest_id, brunch.id, true, 'wedding-invitation', false
FROM public.invitations wedding_invite
JOIN public.events wedding ON wedding.id = wedding_invite.event_id AND wedding.slug = 'wedding'
JOIN public.guests guest ON guest.id = wedding_invite.guest_id AND guest.archived_at IS NULL
CROSS JOIN public.events brunch
WHERE wedding_invite.is_active AND brunch.slug = 'farewell-brunch'
ON CONFLICT (guest_id, event_id) DO UPDATE
 SET is_active = true, assignment_source = EXCLUDED.assignment_source, review_required = false;

-- The retired event's answers must never become answers for brunch.
DELETE FROM public.rsvp_responses
WHERE event_id IN (SELECT id FROM public.events WHERE slug IN ('family-shabbarbeque', 'family-shabbarbecue'));
DELETE FROM public.invitations
WHERE event_id IN (SELECT id FROM public.events WHERE slug IN ('family-shabbarbeque', 'family-shabbarbecue'));
DELETE FROM public.events WHERE slug IN ('family-shabbarbeque', 'family-shabbarbecue');

UPDATE public.events SET attire = 'Formal — and colorful!', updated_at = now() WHERE slug = 'wedding';
UPDATE public.events SET attire = NULL, updated_at = now() WHERE slug = 'welcome-party';

COMMIT;
