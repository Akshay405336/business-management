/** Calendar date in the user's local timezone (`YYYY-MM-DD`). */
export function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateInput(value: string, days: number): string {
  const parsed = new Date(`${value}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return localDateInputValue(parsed);
}

export function formatDisplayDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Toolbar date label: `06-Nov-2026` (day padded, short month, full year). */
export function formatDailyTaskNavDateLabel(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleDateString('en-GB', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
}
