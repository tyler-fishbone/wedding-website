# wedding-website

Mobile-first wedding website for Katie and Tyler, built with Next.js + TypeScript.

## Routes

- `/` — wedding home and countdown
- `/our-story` — editorial story page
- `/schedule` — wedding-weekend events
- `/local-guide` — Austin lodging, food, activities, and transportation
- `/faq` — guest questions
- `/registry` — registry information
- `/rsvp` — household lookup and event RSVPs backed by Supabase
- `/save-the-date` — calendar links and mailing-address collection

The mailing-address form submits to `POST /api/address`. The server archives submissions in Supabase, updates a clearly matched household, and sends ambiguous matches to the private admin review. Address collection stays separate from RSVP.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

3. Set server-only Supabase values in `.env.local`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-secret-key
RSVP_SESSION_SECRET=a-random-secret-of-at-least-32-characters
RSVP_ADMIN_PASSPHRASE=your-private-planning-passphrase
```

Address collection needs only the database URL and secret key. RSVP and admin sessions also need their respective secrets.

4. Start dev server:

```bash
npm run dev
```

## Configuration and deployment

See [setup notes](docs/rsvp-setup.md) for server credentials, migrations, fictional fixtures, and verification. Configure the same server-only values in Vercel before deploying. Google Sheets credentials are no longer required for address collection. Never prefix server secrets with `NEXT_PUBLIC_`.

## Form behavior

- Address collection lives at `/save-the-date` and stores new submissions in Supabase.
- Consistent exact names or an email match can identify an existing household; conflicting or ambiguous matches require private admin review.
- Submissions preserve mailing holds and never create guests, households, event invitations, or RSVP answers.
- Countries outside the US have flexible state and postal fields.
- Every submission is archived, including the optional fortune-cookie answer. Retries are idempotent.
- Missing configuration or a failed write returns an error. Submitted contact details are never logged.

## RSVP persistence

See [RSVP setup](docs/rsvp-setup.md) for Supabase configuration, SQL migrations, fictional fixtures, and end-to-end verification. The save-the-date address flow uses the same database while keeping separate screens and server operations.
