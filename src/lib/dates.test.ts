// Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayOf, formatTimeRange, localToUtcIso, weekStartOf } from "./dates.ts";

test("winter evening (EST, UTC-5): 8 PM Nov 20 is 01:00 UTC the next day", () => {
  assert.equal(localToUtcIso("2026-11-20", "20:00"), "2026-11-21T01:00:00.000Z");
});

test("summer evening (EDT, UTC-4): 8 PM Jul 10 is 00:00 UTC the next day", () => {
  assert.equal(localToUtcIso("2026-07-10", "20:00"), "2026-07-11T00:00:00.000Z");
});

test("daylight saving ends Nov 1 2026: midnight Nov 1 is still EDT, midnight Nov 2 is EST", () => {
  assert.equal(localToUtcIso("2026-11-01", "00:00"), "2026-11-01T04:00:00.000Z");
  assert.equal(localToUtcIso("2026-11-02", "00:00"), "2026-11-02T05:00:00.000Z");
});

test("daylight saving starts Mar 8 2026: 3 AM that day is EDT", () => {
  assert.equal(localToUtcIso("2026-03-08", "03:00"), "2026-03-08T07:00:00.000Z");
});

test("a late show lands on the right Dayton day", () => {
  const iso = localToUtcIso("2026-11-20", "23:30");
  assert.equal(dayOf(iso), "2026-11-20");
});

test("weeks run Monday to Sunday", () => {
  assert.equal(weekStartOf("2026-11-07"), "2026-11-02"); // a Saturday
  assert.equal(weekStartOf("2026-11-02"), "2026-11-02"); // a Monday
  assert.equal(weekStartOf("2026-11-08"), "2026-11-02"); // a Sunday
});

test("addDays crosses month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("time range", () => {
  assert.equal(formatTimeRange(localToUtcIso("2026-11-20", "20:00"), 120), "8:00 PM to 10:00 PM");
});
