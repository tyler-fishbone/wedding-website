import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { events, navigation, registryItems, wedding } from "../app/content/wedding.ts";

test("wedding facts use the confirmed date and weekday", () => {
  assert.equal(wedding.dateIso, "2027-04-04");
  assert.equal(wedding.dateLabel, "Sunday, April 4, 2027");
  assert.match(wedding.countdownTarget, /^2027-04-04T\d{2}:\d{2}:\d{2}-05:00$/);
});

test("navigation exposes every required direct route", () => {
  assert.deepEqual(
    navigation.map((item) => item.href),
    ["/", "/our-story", "/schedule", "/local-guide", "/faq", "/registry", "/rsvp", "/save-the-date"],
  );
  assert.ok(navigation.every((item) => !item.href.includes("javascript:")));
  assert.deepEqual(navigation.filter((item) => item.highlight).map((item) => item.href), ["/save-the-date"]);
});

test("public content does not expose planning or template language", () => {
  const serialized = JSON.stringify({ events, registryItems }).toLowerCase();
  for (const forbidden of ["likely", "exploring", "placeholder", "javascript:void"]) {
    assert.ok(!serialized.includes(forbidden), `public content includes ${forbidden}`);
  }
  assert.ok(registryItems.filter((item) => !item.href).every((item) => item.status === "coming-soon"));
});

test("save the date form has no guest query mode", async () => {
  const source = await readFile(new URL("../app/components/SaveTheDateForm.tsx", import.meta.url), "utf8");
  for (const forbidden of ["useSearchParams", "echad", "isSingleGuest"]) {
    assert.ok(!source.includes(forbidden), `form source includes ${forbidden}`);
  }
});
