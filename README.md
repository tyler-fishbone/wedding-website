# wedding-website

Mobile-first Save the Date website built with Next.js + TypeScript.

The mailing-address form now submits to a Next.js API route (`POST /api/address`) and the server forwards to your webhook. This avoids browser CORS issues and keeps webhook secrets server-side.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

3. Set webhook env values in `.env.local`:

```bash
WEDDING_WEBHOOK_URL=https://your-webhook-url.example.com
WEDDING_WEBHOOK_TOKEN=
```

4. Start dev server:

```bash
npm run dev
```

## Environment variables

- `WEDDING_WEBHOOK_URL`: server-side webhook URL used by `POST /api/address`.
- `WEDDING_WEBHOOK_TOKEN`: optional server-side token appended as `?token=...`.
- `NEXT_PUBLIC_BASE_PATH`: optional only if hosting under a subpath.

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. In Vercel Project Settings > Environment Variables, set:
   - `WEDDING_WEBHOOK_URL`
   - `WEDDING_WEBHOOK_TOKEN` (optional)
4. Deploy.

## Form behavior

- Client submits JSON to `/api/address`.
- API route validates required fields, email format, and phone digits.
- API route forwards the payload to your configured webhook.
- If `WEDDING_WEBHOOK_URL` is missing (local dev), the API logs payload and returns a fake success after a short delay.
