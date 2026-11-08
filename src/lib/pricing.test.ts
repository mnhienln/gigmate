// Run with: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { BOOST, CANCEL, PLANS, TRIAL_DAYS, isBoosted, isLateCancellation, isPlanId } from "./pricing.ts";

const NOW = new Date("2026-11-10T18:00:00Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600000).toISOString();

test("the price list matches what the plans promised", () => {
  assert.deepEqual(PLANS.map((p) => [p.id, p.cents, p.interval]), [["weekly", 500, "week"], ["monthly", 1600, "month"], ["yearly", 12000, "year"]]);
  assert.equal(TRIAL_DAYS, 7);
  assert.equal(BOOST.cents, 1000);
  assert.equal(BOOST.hours, 24);
  assert.equal(CANCEL.feeCents, 2500);
  assert.equal(CANCEL.windowHours, 48);
});

test("the yearly plan really saves what the screen claims (37.5 percent, shown rounded down as 37%)", () => {
  const monthly = PLANS.find((p) => p.id === "monthly")!.cents * 12;
  const yearly = PLANS.find((p) => p.id === "yearly")!.cents;
  const saving = (1 - yearly / monthly) * 100;
  assert.equal(saving, 37.5);
  assert.ok(Math.floor(saving) >= 37, "the 'save 37%' label must never overstate the saving");
  assert.match(PLANS.find((p) => p.id === "yearly")!.blurb, /37%/);
});

test("only known plan names are accepted", () => {
  assert.equal(isPlanId("monthly"), true);
  assert.equal(isPlanId("platinum"), false);
  assert.equal(isPlanId(undefined), false);
});

test("cancelling is free at exactly 48 hours and later, and late just under 48 hours", () => {
  assert.equal(isLateCancellation(inHours(48), NOW), false);
  assert.equal(isLateCancellation(inHours(47.99), NOW), true);
  assert.equal(isLateCancellation(inHours(200), NOW), false);
  assert.equal(isLateCancellation(inHours(1), NOW), true);
  assert.equal(isLateCancellation(inHours(-2), NOW), true); // already started
});

test("a boost counts until its end time", () => {
  assert.equal(isBoosted(inHours(1), NOW), true);
  assert.equal(isBoosted(inHours(-1), NOW), false);
  assert.equal(isBoosted(null, NOW), false);
  assert.equal(isBoosted(undefined, NOW), false);
});
