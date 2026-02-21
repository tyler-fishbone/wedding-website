import { NextResponse } from "next/server";
import { createSign } from "node:crypto";
import type { WeddingFormPayload } from "../../lib/weddingFormTypes";

type ValidationResult = {
  ok: true;
} | {
  ok: false;
  message: string;
};

const requiredFields: Array<keyof WeddingFormPayload> = [
  "fullName",
  "email",
  "phone",
  "address1",
  "city",
  "state",
  "zip"
];

const validatePayload = (payload: WeddingFormPayload): ValidationResult => {
  for (const field of requiredFields) {
    if (!payload[field]?.trim()) {
      return { ok: false, message: `Missing required field: ${field}` };
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(payload.email.trim())) {
    return { ok: false, message: "Invalid email address." };
  }

  const digitsOnly = payload.phone.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return { ok: false, message: "Invalid phone number." };
  }

  return { ok: true };
};

const toBase64Url = (value: string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getGoogleAccessToken = async (
  serviceAccountEmail: string,
  serviceAccountPrivateKey: string
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const claimSet = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };

  const unsignedJwt = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claimSet))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(serviceAccountPrivateKey);
  const jwt = `${unsignedJwt}.${signature
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text().catch(() => "");
    throw new Error(`Failed to get Google access token (${tokenResponse.status}): ${detail}`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("Google token response did not include access_token.");
  }

  return tokenJson.access_token;
};

const appendToGoogleSheet = async (payload: WeddingFormPayload): Promise<void> => {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "Responses";
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!spreadsheetId || !serviceAccountEmail || !serviceAccountPrivateKey) {
    throw new Error(
      "Missing Google Sheets env vars. Required: GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const accessToken = await getGoogleAccessToken(serviceAccountEmail, serviceAccountPrivateKey);
  const range = encodeURIComponent(`${sheetName}!A:J`);
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const row = [
    payload.submittedAt || new Date().toISOString(),
    payload.fullName,
    payload.email,
    payload.phone,
    payload.address1,
    payload.address2 || "",
    payload.city,
    payload.state,
    payload.zip,
    payload.userAgent || ""
  ];

  const appendResponse = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [row] })
  });

  if (!appendResponse.ok) {
    const detail = await appendResponse.text().catch(() => "");
    throw new Error(`Google Sheets append failed (${appendResponse.status}): ${detail}`);
  }
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WeddingFormPayload;

    const validation = validatePayload(payload);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.message }, { status: 400 });
    }

    // Development fallback: allow local testing without external services configured.
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.info(
        "GOOGLE_SHEETS_SPREADSHEET_ID is not set. Logging payload instead of writing to Sheets.",
        payload
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      return NextResponse.json({ ok: true, mode: "dev-fallback" }, { status: 200 });
    }

    await appendToGoogleSheet(payload);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Address submission handler failed", error);
    return NextResponse.json({ ok: false, error: "Submission failed." }, { status: 500 });
  }
}
