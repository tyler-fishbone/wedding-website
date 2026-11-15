# RSVP development

The RSVP page now uses Supabase PostgreSQL through the Next.js server. It supports name lookup, email fallback, household confirmation, only invited events/people, independent attendance, review, save, and returning edits. It does not include mailing-address collection or updates. The separate save-the-date form also persists in Supabase and updates household mailing details; it never changes RSVP answers.

## Local configuration

Set these server-only values in the gitignored `.env.local`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-existing-secret-api-key
RSVP_SESSION_SECRET=a-random-secret-of-at-least-32-characters
```

Do not use `NEXT_PUBLIC_` for these credentials. The server API key is sent to Supabase only by server code. An HTTP-only signed cookie holds the confirmed household session; lookup choices use short-lived tokens with a separate purpose.

The app uses Supabase's REST API and database functions without a new runtime dependency. Missing configuration returns an unavailable response, never a fake successful RSVP.

## Database

The SQL files under `supabase/migrations/` define the tables and server-only functions. They were applied to the wedding Supabase project through the dashboard SQL editor during development. They are not yet recorded in the Supabase CLI migration-history table. Before introducing `supabase db push`, reconcile that history for this existing project; do not blindly rerun the initial CREATE TABLE migration.

Tables have RLS enabled and no direct grants to `anon` or `authenticated`. The lookup/save functions can only be called by `service_role`. The save function validates all invited guest/event answers, locks the household row, and upserts the complete response set in one transaction. There is one current answer per invitation, not a historical response log. Concurrent valid submissions are serialized; the latest complete submission wins.

Three real events are loaded in the database. Public schedule content remains separately maintained; future changes should update both until a shared source is implemented.

## Fictional fixture

`supabase/fixtures/rsvp-demo.sql` adds two fictional households and test events; it can be rerun without resetting responses:

- Alex Example and Sam Example: both invited to Test wedding; only Alex invited to Test welcome party.
- Jordan Sample: invited only to Test wedding.
- Household email fallback: `alex@example.com` or `jordan@example.com`.

The fictional rows remain privately archived, but migration `202610180008_retire_demo_invitations.sql` disables all of their event invitations. They are omitted from planning totals and no longer appear in public RSVP lookup. Use an isolated development database for future fixture-based integration testing; do not enable these invitations on the live production database.

## Verification

```
npm test
npm run typecheck
npm run build
npm run dev -- --hostname 127.0.0.1 --port 3100
node tests/rsvp-integration.mjs
```

The integration script targets `http://127.0.0.1:3100` by default. Set `RSVP_TEST_ORIGIN` to change it. It reads `.env.local`, changes only the fictional fixtures' responses, and verifies name/email lookup, confirmation, invitation scoping, save/reload/edit, rejected foreign/duplicate/incomplete answers, atomic rejection in the database, and cross-origin rejection.

The browser walkthrough also verified household confirmation, independent answers, review, save confirmation and restored answers after reload.

## Remaining work before real guests

Review provisional household groupings and invitations; decide optional questionnaire fields; reconcile dashboard-applied migration history before adopting CLI database pushes. Production credentials, request limits, and deployment are complete. There is no planned paid upgrade. No deployment or Git commit/push was performed in this increment.


## Private planning overview

`/admin` is unlinked and marked noindex. Set `RSVP_ADMIN_PASSPHRASE` privately in the server environment; never use a `NEXT_PUBLIC_` name. Sign-in exchanges the shared passphrase for an eight-hour HttpOnly cookie. Every admin request verifies the cookie. Changing the passphrase invalidates existing sessions. No Supabase Auth accounts or emails are required. The overview lists mailing holds, provisional household groups, family classification gaps, first-pass event invitations, and unresolved import notes.

The real import contains 177 named guests in 111 households, three events, 271 invitations, and 28 follow-up issues. The 94 address-based welcome-party assignments require review. Family-only assignments remain pending. Original source rows are archived privately in `import_source_records`; never commit raw source snapshots.

Admin controls currently edit named guests, household assignment, family classification, household contacts and addresses, mailing holds, grouping review status, invitation review confirmation, and follow-up resolution. Classification alone does not automatically create or remove event invitations. Use each guest’s event controls to invite, remove, or invite again. A generated passphrase is configured locally in the gitignored `.env.local`; replace it there privately if desired. The same server-only values are configured in Vercel Production; secrets are stored as sensitive variables.


## Event invitation changes

The admin page lists every event for each named guest. Invite adds an unanswered invitation; Remove invitation hides that event from RSVP. Removing retains the invitation row and any saved response. Invite again restores the retained response. An explicit admin change also resolves that invitation’s provisional review flag. No emails are sent.

Migrations `202610180004_invitation_controls.sql` and `202610180005_invitation_submission_lock.sql` are applied to the current Supabase project. Active invitations alone participate in lookup, guest views, and response validation. Both admin edits and RSVP writes use transactions; invitation row locks prevent a concurrent removal from being bypassed by a submission, including during household reassignment.

`node tests/invitation-integration.mjs` tests this through the local server and database using only the deterministic fictional fixture. It verifies adding, removing, and reactivating invitations, retained answers, rejected stale submissions, missing records, and households with no active invitations, then restores the fixture’s active invitations. Run it after configuring the local admin passphrase and applying the migrations.


## Address collection

Migration `202610180006_address_collection.sql` is applied. The processed Mail Merge households, mailing holds, original source records and follow-up notes are preserved; this change handles new submissions only. `/save-the-date` posts bounded, validated JSON to `/api/address`. The database archives it in the private `address_submissions` table, intersects consistent exact-name/email matches, and updates a unique household in one transaction. Conflicting or ambiguous matches remain pending for the admin address-review panel. No guest or household records are created.

The address update includes household email and phone, street address, city, region, postal code, and country. Existing `on_hold` mailing status remains held; other successfully matched addresses become `ready`. Household grouping and event eligibility remain unchanged. The optional fortune-cookie answer and original submission metadata are retained in the archive. Repeat submission IDs return the original result without applying twice or overwriting a newer address.

Address persistence requires only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Google Sheets credentials are unused by this endpoint; local legacy credentials have been left in place. The authorized production deployment is live at `https://tylerkatiewedding.vercel.app`.

Run `node tests/address-integration.mjs` against the local production server to verify matching, conflicts, ambiguity, retries, holds, international input, private review, and fixture restoration. `node tests/address-config-integration.mjs` verifies independence from RSVP configuration against a second local server started with `RSVP_SESSION_SECRET= npm run start -- --hostname 127.0.0.1 --port 3101`. Both tests change only fictional fixtures and restore their mailing fields.


## Production release — October 18, 2026

Live deployment: `dpl_G1GhWAR7UBFUz7zfNuZj4bMAZ1AX`, serving `https://tylerkatiewedding.vercel.app`. Published directly from this local checkout through the existing Vercel project; no Git commit or push was made. The prior deployment `dpl_rV38Dy6Kgj2fxEKhFcHocgat8vE6` remains available for rollback.

Migrations 0001–0008 are applied through the Supabase dashboard. The CLI migration history has not been reconciled; do not blindly run `supabase db push`.

Production links:
- `/rsvp`: invitation QR destination; real household lookup and confirmation verified without writing real RSVP answers.
- `/save-the-date`: separate address flow, now backed by Supabase.
- `/admin`: unlinked shared-passphrase admin; passphrase is retained privately in local `.env.local`.

Shared request budgets use private, HMAC-hashed visitor-address keys: 60 lookups per 10 minutes, 20 address submissions per hour, and 10 admin sign-in attempts per 15 minutes. Exceeded budgets return HTTP429. The limiter uses PostgreSQL atomic upserts so Vercel instances share the budget.

Verification: 21 unit tests, type checking, local production build, Vercel production build, address/invitation/RSVP/rate-limit integration tests, live page and API smoke tests, secure admin cookie, and live fictional address-write/restore all passed. All 111 processed real household records, four mailing holds, and 271 real invitations were read back unchanged. No real RSVP answers were written. Fictional invitations remain inactive.

The invitation QR encodes `https://tylerkatiewedding.vercel.app/rsvp`. Google Calendar, Apple Calendar, schedule and countdown now consistently use the working 5PM start. Welcome-party wording includes family and out-of-state guests. Wedding attire remains TBD. Guest/family/invitation review is deferred to Tyler and Katie.


### Household admin update (October 18)

The admin index is now a compact household table with event filters. It loads a slim household summary without RSVP responses, planning issue bodies or address submissions. Editing is at `/admin/households/<id>`; global follow-ups and address review are at `/admin/review`. Event invite controls apply transactionally to every current household member; individual RSVP answers are preserved. Moving a guest inherits the destination household's active event invitations. Mixed pre-existing assignments are shown for review rather than changed automatically. Empty former household records remain stored, but do not clutter the table.

Migration `202610180009_household_invitations.sql` was applied manually through Supabase SQL editor. Do not blindly replay migrations. `tests/household-invitations.sql` verifies invite/remove/reinvite, saved answers, stale form rejection and guest moves inside a transaction that rolls back all fixtures. The older `tests/invitation-integration.mjs` describes the previous per-person admin behavior and should not be run against production.

Michael, Christell, Brendan and Addy Baum are now consolidated in the existing parents' household. Their current invitations matched already and were preserved. The shared passphrase was changed as requested, invalidating prior admin sessions on deployment.


### Add guests and households

`/admin/add` creates a household with 1–20 named guests and explicit event selections; `/admin/add?mode=guest` adds named guests to an existing household and inherits its active invitations, including provisional review flags. The household page also links directly to Add guest with that household selected. New households begin with missing-address status; contact and address details are edited afterward. Client-generated guest and household IDs remain stable across unchanged retries, and database validation rejects duplicate active guest names within a household. All inserts occur through the service-only transactional `admin_create_guests` RPC from migration 0011 (applied manually). `tests/admin-create-guests.sql` exercises creation, retries, inheritance, duplicate rejection and saved response preservation inside a rolled-back transaction.

The compact household index now shows mailing address lines directly; absent street addresses display missing address, and mailing holds remain visible.
