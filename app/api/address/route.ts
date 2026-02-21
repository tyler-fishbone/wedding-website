import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WeddingFormPayload;

    const validation = validatePayload(payload);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.message }, { status: 400 });
    }

    const webhookBaseUrl = process.env.WEDDING_WEBHOOK_URL;
    const webhookToken = process.env.WEDDING_WEBHOOK_TOKEN ?? "";

    // Development fallback: allow local testing without external services configured.
    if (!webhookBaseUrl) {
      console.info("WEDDING_WEBHOOK_URL is not set. Logging payload instead.", payload);
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      return NextResponse.json({ ok: true, mode: "dev-fallback" }, { status: 200 });
    }

    const webhookUrl = webhookToken
      ? `${webhookBaseUrl}?token=${encodeURIComponent(webhookToken)}`
      : webhookBaseUrl;

    const upstreamResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!upstreamResponse.ok) {
      const detail = await upstreamResponse.text().catch(() => "");
      console.error("Webhook upstream failed", upstreamResponse.status, detail);
      return NextResponse.json({ ok: false, error: "Webhook request failed." }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Address submission handler failed", error);
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}
