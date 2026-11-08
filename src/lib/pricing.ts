/*
  Every price and money rule in one place, so the screens, the Stripe setup and the tests can never disagree.
  Amounts are in cents. These are TEST MODE prices while the app is a demo.
*/
export const PLANS = [
  { id: "weekly", lookupKey: "gigmate_weekly", cents: 500, interval: "week", label: "Weekly", blurb: "Pay as you go" },
  { id: "monthly", lookupKey: "gigmate_monthly", cents: 1600, interval: "month", label: "Monthly", blurb: "Most popular" },
  { id: "yearly", lookupKey: "gigmate_yearly", cents: 12000, interval: "year", label: "Yearly", blurb: "Best value, save 37%" },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const isPlanId = (v: unknown): v is PlanId => PLANS.some((p) => p.id === v);

/** Free days before the first payment. Only the first subscription gets a trial. */
export const TRIAL_DAYS = 7;

/** A venue pays this to show a gig first in Discover for a while. */
export const BOOST = { cents: 1000, hours: 24 } as const;

/** A venue that cancels a confirmed gig closer than this pays the fee. */
export const CANCEL = { windowHours: 48, feeCents: 2500 } as const;

/** True when cancelling now would be a LATE cancellation (closer to the start than the free window). */
export function isLateCancellation(startsAt: string, now: Date = new Date()): boolean {
  return (new Date(startsAt).getTime() - now.getTime()) / 3600000 < CANCEL.windowHours;
}

/** True while a gig's boost has not run out yet. */
export function isBoosted(boostedUntil: string | null | undefined, now: Date = new Date()): boolean {
  return Boolean(boostedUntil && new Date(boostedUntil).getTime() > now.getTime());
}
