export function sumAllocationDays(days: readonly string[]): string {
  let total = 0;
  for (const raw of days) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= 0) total += parsed;
  }
  const fixed = total.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}
