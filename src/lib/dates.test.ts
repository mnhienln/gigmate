// Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayOf, formatTimeRange, localToUtcIso, parseWhen, timeAgo, weekStartOf, whenRange } from "./dates.ts";

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

test("whenRange today ends at the next Dayton midnight", () => {
  const now = new Date("2026-11-07T22:00:00Z"); // Sat 5 PM Dayton
  assert.equal(whenRange("today", now).to, "2026-11-08T05:00:00.000Z");
  assert.equal(whenRange("today", now).from, now.toISOString());
});

test("whenRange week is seven Dayton days ahead", () => {
  const now = new Date("2026-11-07T22:00:00Z");
  assert.equal(whenRange("week", now).to, localToUtcIso("2026-11-14", "00:00"));
});

test("weekend from midweek starts Friday 5 PM and ends Monday midnight", () => {
  const wed = new Date("2026-11-04T17:00:00Z"); // Wed noon Dayton
  const r = whenRange("weekend", wed);
  assert.equal(r.from, "2026-11-06T22:00:00.000Z"); // Fri 5 PM EST
  assert.equal(r.to, "2026-11-09T05:00:00.000Z"); // Mon 12 AM EST
});

test("weekend on Friday morning still starts at 5 PM, on Friday night starts now", () => {
  assert.equal(whenRange("weekend", new Date("2026-11-06T15:00:00Z")).from, "2026-11-06T22:00:00.000Z");
  const night = new Date("2026-11-07T01:00:00Z"); // Fri 8 PM Dayton
  assert.equal(whenRange("weekend", night).from, night.toISOString());
});

test("weekend on Saturday and Sunday starts now and ends Monday midnight", () => {
  const sat = new Date("2026-11-07T17:00:00Z");
  const sun = new Date("2026-11-08T17:00:00Z");
  assert.equal(whenRange("weekend", sat).to, "2026-11-09T05:00:00.000Z");
  assert.equal(whenRange("weekend", sun).to, "2026-11-09T05:00:00.000Z");
});

test("any date has no end, and unknown values fall back to any", () => {
  assert.equal(whenRange("any").to, undefined);
  assert.equal(parseWhen("nonsense"), "any");
  assert.equal(parseWhen("today"), "today");
});

test("timeAgo", () => {
  const now = new Date("2026-11-07T12:00:00Z");
  assert.equal(timeAgo("2026-11-07T11:59:40Z", now), "now");
  assert.equal(timeAgo("2026-11-07T11:30:00Z", now), "30m");
  assert.equal(timeAgo("2026-11-07T10:00:00Z", now), "2h");
  assert.equal(timeAgo("2026-11-04T12:00:00Z", now), "3d");
});
