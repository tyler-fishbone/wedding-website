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
