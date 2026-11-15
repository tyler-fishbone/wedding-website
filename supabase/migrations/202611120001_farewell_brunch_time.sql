UPDATE public.events
SET starts_at = TIMESTAMPTZ '2027-04-05 09:30:00 America/Chicago',
    ends_at = TIMESTAMPTZ '2027-04-05 11:30:00 America/Chicago',
    description = 'Location to be announced.',
    updated_at = now()
WHERE slug = 'farewell-brunch';
