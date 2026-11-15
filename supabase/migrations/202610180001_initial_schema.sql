-- Initial wedding RSVP schema for Supabase PostgreSQL.
BEGIN;

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  contact_email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX households_contact_email_lookup
  ON households (lower(btrim(contact_email)));

CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guests_household_lookup ON guests (household_id);
CREATE INDEX guests_name_lookup ON guests (lower(btrim(display_name)));
CREATE INDEX guests_email_lookup ON guests (lower(btrim(email)));

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(btrim(slug)) > 0),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  time_zone text NOT NULL DEFAULT 'America/Chicago',
  venue_name text,
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text,
  attire text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at))
);

CREATE TABLE invitations (
  guest_id uuid NOT NULL REFERENCES guests(id),
  event_id uuid NOT NULL REFERENCES events(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, event_id)
);

CREATE INDEX invitations_event_lookup ON invitations (event_id);

CREATE TABLE rsvp_responses (
  guest_id uuid NOT NULL,
  event_id uuid NOT NULL,
  attendance text NOT NULL CHECK (attendance IN ('attending', 'declined')),
  responded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, event_id),
  FOREIGN KEY (guest_id, event_id) REFERENCES invitations(guest_id, event_id)
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE households, guests, events, invitations, rsvp_responses
  FROM anon, authenticated;

COMMIT;
