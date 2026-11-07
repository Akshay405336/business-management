/** Human-readable allocated days with correct singular/plural (e.g. `1 day`, `10 days`). */
export function formatAllocationDaysLabel(annualAllocationDays: string): string {
  const trimmed = annualAllocationDays.trim();
  const value = Number.parseFloat(trimmed);
  if (!Number.isFinite(value)) {
    return `${trimmed} days`;
  }
  const unit = value === 1 ? 'day' : 'days';
  const display =
    trimmed.includes('.') && trimmed.endsWith('.0')
      ? trimmed.slice(0, -2)
      : Number.isInteger(value)
        ? String(value)
        : trimmed;
  return `${display} ${unit}`;
}
