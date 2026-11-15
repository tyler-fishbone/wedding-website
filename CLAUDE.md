# Wedding website

Next.js 16 app deployed on Vercel (https://tylerkatiewedding.vercel.app). Supabase Postgres via REST from server code only. See `docs/rsvp-setup.md` for the RSVP, admin and data model details.

## Checks

- `npm test` needs Node 22.6+ (`--experimental-strip-types`). Use `~/.nvm/versions/node/v24.13.1/bin` if the default Node is older.
- `npm run typecheck`, `npm run build`.
- Integration scripts in `tests/*.mjs` hit a local dev server and the live database using fictional fixtures only.

## Database migrations

- SQL files live in `supabase/migrations/`. They are applied by hand in the Supabase dashboard SQL editor (project `extjsjxcfqulxvmizhsn`), not with the Supabase CLI. The CLI migration history is not reconciled, so never run `supabase db push`.
- Apply a migration before deploying code that depends on it.
- Check whether a migration is live with a read-only REST query using `SUPABASE_URL` / `SUPABASE_SECRET_KEY` from `.env.local` (for example select the new column with `limit=1`).

## Deploy

- Vercel is the real site. GitHub Pages is retired.
- Secrets live in `.env.local` locally and in Vercel Production env vars. Never use `NEXT_PUBLIC_` for server secrets.
