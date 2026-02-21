# wedding-website

Mobile-first Save the Date website built with Next.js + TypeScript.

The mailing-address form submits to a Next.js API route (`POST /api/address`) and the server writes directly to Google Sheets with the Google Sheets API. This avoids browser CORS issues and keeps credentials server-side.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create local env:

```bash
cp .env.example .env.local
```

3. Set Google Sheets env values in `.env.local`:

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=your-google-sheet-id
GOOGLE_SHEETS_SHEET_NAME=Responses
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

4. Start dev server:

```bash
npm run dev
```

## Environment variables

- `GOOGLE_SHEETS_SPREADSHEET_ID`: destination spreadsheet ID.
- `GOOGLE_SHEETS_SHEET_NAME`: destination tab name (defaults to `Responses`).
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Google service account client email.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: service account private key (store with literal `\n` newlines).
- `NEXT_PUBLIC_BASE_PATH`: optional only if hosting under a subpath.

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. In Vercel Project Settings > Environment Variables, set:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_SHEET_NAME` (optional, defaults to `Responses`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
4. Deploy.
5. Share your Google Sheet with the service account email as an editor.

## Form behavior

- Client submits JSON to `/api/address`.
- API route validates required fields, email format, and phone digits.
- API route obtains a Google OAuth access token with the service account and appends one row to the configured sheet.
- If `GOOGLE_SHEETS_SPREADSHEET_ID` is missing (local dev), the API logs payload and returns a fake success after a short delay.
