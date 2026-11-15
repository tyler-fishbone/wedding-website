import assert from "node:assert/strict";
import test from "node:test";

import { buildGoogleCalendarUrl } from "../app/lib/calendar.ts";

test("buildGoogleCalendarUrl includes the event details", () => {
  const url = new URL(
    buildGoogleCalendarUrl({
      title: "Katie + Tyler Wedding",
      startDateTime: "20270404T160000",
      endDateTime: "20270404T230000",
      timezone: "America/Chicago",
      location: "Addison Grove, Austin, Texas",
      details: "Ceremony and reception",
    }),
  );

  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), "Katie + Tyler Wedding");
  assert.equal(url.searchParams.get("dates"), "20270404T160000/20270404T230000");
  assert.equal(url.searchParams.get("ctz"), "America/Chicago");
  assert.equal(url.searchParams.get("location"), "Addison Grove, Austin, Texas");
  assert.equal(url.searchParams.get("details"), "Ceremony and reception");
});

test("Apple Calendar files contain one event with UTC times and escaped text", async () => {
  const { buildAppleCalendarFile } = await import("../app/lib/calendar.ts");
  const file = buildAppleCalendarFile({
    id: "brunch-id",
    title: "Katie & Tyler; Farewell Brunch",
    startsAt: "2027-04-05T09:30:00-05:00",
    endsAt: "2027-04-05T11:30:00-05:00",
    location: "",
    details: "Location to be announced.\n" + "Café, bagels and coffee. ".repeat(5),
  }, new Date("2026-11-12T18:00:00Z"));

  assert.ok(file.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
  const lines = file.replace(/\r\n /g, "").split("\r\n");
  assert.equal(lines.filter(line => line === "BEGIN:VEVENT").length, 1);
  assert.ok(lines.includes("UID:brunch-id@tylerkatiewedding.vercel.app"));
  assert.ok(lines.includes("DTSTAMP:20261112T180000Z"));
  assert.ok(lines.includes("DTSTART:20270405T143000Z"));
  assert.ok(lines.includes("DTEND:20270405T163000Z"));
  assert.ok(lines.includes("SUMMARY:Katie & Tyler\\; Farewell Brunch"));
  assert.ok(lines.some(line => line.startsWith("DESCRIPTION:Location to be announced.\\nCafé\\,")));
  assert.ok(!lines.some(line => line.startsWith("LOCATION:")));
});
