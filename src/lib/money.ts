// Money is stored as integer cents everywhere. Convert only at the screen edge.

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars.toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
}

export function formatRateRange(minCents: number | null, maxCents: number | null): string {
  if (minCents == null && maxCents == null) return "Rate not set";
  if (minCents == null || maxCents == null || minCents === maxCents) return formatUsd((minCents ?? maxCents) as number);
  return `${formatUsd(minCents)} to ${formatUsd(maxCents)}`;
}
