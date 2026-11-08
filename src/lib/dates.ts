/*
  Time handling for GigMate.

  Rule: the database stores instants in UTC (timestamptz). People think in
  Dayton time. So we convert at the edges:
    form (Dayton date + time)  ->  UTC instant  ->  database
    database  ->  Dayton date and time labels  ->  screen
  Day-only values travel as "YYYY-MM-DD" strings, which have no timezone
  and so cannot shift by a day.

  Written with the built-in Intl API instead of a date library: fewer
  dependencies, and Intl already knows daylight saving rules.
  Tradeoff: we write the small conversion helper ourselves, so it has tests
  (src/lib/dates.test.ts), especially around the daylight saving switch.
*/

export const TZ = "America/New_York";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDateString = (v: string) => DATE_RE.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
export const isTimeString = (v: string) => TIME_RE.test(v);

/** How many minutes the Dayton clock is ahead of UTC at a given instant (negative here). */
function offsetMinutes(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asIfUtc - utcMs) / 60000;
}

/** Dayton wall-clock date + time to a UTC ISO string. Two passes so the daylight saving edge is right. */
export function localToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let utc = naive - offsetMinutes(naive) * 60000;
  utc = naive - offsetMinutes(utc) * 60000;
  return new Date(utc).toISOString();
}

/** Today's date in Dayton as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Dayton calendar date of a stored instant, as YYYY-MM-DD. */
export function dayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing the given date (weeks run Monday to Sunday). */
export function weekStartOf(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return addDays(date, -sinceMonday);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** "Fri, Nov 20" for a YYYY-MM-DD date. */
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(date + "T00:00:00Z"),
  );
}

export function formatWeekday(date: string, style: "short" | "narrow" = "short"): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style }).format(new Date(date + "T00:00:00Z"));
}

export function dayNumber(date: string): number {
  return Number(date.slice(8, 10));
}

/** "8:00 PM to 10:00 PM" from a start instant and a set length. */
export function formatTimeRange(startIso: string, minutes: number): string {
  const end = new Date(new Date(startIso).getTime() + minutes * 60000).toISOString();
  return `${formatTime(startIso)} to ${formatTime(end)}`;
}

export type When = "any" | "today" | "week" | "weekend";
export const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: "any", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "weekend", label: "This weekend" },
];

export function parseWhen(v: unknown): When {
  return v === "today" || v === "week" || v === "weekend" ? v : "any";
}

/*
  The time window for a "when" filter. Always starts no earlier than right now,
  so gigs that already began never show up. All boundaries are Dayton midnights.
  "Weekend" means Friday 5 PM to Monday 12 AM (Dayton time).
*/
export function whenRange(when: When, now: Date = new Date()): { from: string; to?: string } {
  const from = now.toISOString();
  const today = todayLocal(now);
  if (when === "any") return { from };
  if (when === "today") return { from, to: localToUtcIso(addDays(today, 1), "00:00") };
  if (when === "week") return { from, to: localToUtcIso(addDays(today, 7), "00:00") };

  const dow = new Date(today + "T00:00:00Z").getUTCDay(); // 0 Sunday ... 6 Saturday
  if (dow === 6) return { from, to: localToUtcIso(addDays(today, 2), "00:00") };
  if (dow === 0) return { from, to: localToUtcIso(addDays(today, 1), "00:00") };
  const friday = addDays(today, 5 - dow);
  const fridayEvening = localToUtcIso(friday, "17:00");
  return { from: fridayEvening > from ? fridayEvening : from, to: localToUtcIso(addDays(friday, 3), "00:00") };
}

/** Short relative time for feeds: "now", "5m", "2h", "3d", then a date. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;
  return formatDay(dayOf(iso));
}

/** "NOV" style short month for a YYYY-MM-DD date. */
export function formatMonthShort(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(new Date(date + "T00:00:00Z")).toUpperCase();
}

/** "Nov 2" for a YYYY-MM-DD date. */
export function formatMonthDay(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(date + "T00:00:00Z"));
}
