/** Calendar helpers using local date arithmetic (labels only; API uses plain YYYY-MM-DD). */

export function localDateInputValue(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const parts = monthKey.split('-');
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  if (!y || !mo || mo < 1 || mo > 12) return null;
  return { year: y, monthIndex: mo - 1 };
}

export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthRangeUtcIso(monthKey: string): { startDate: string; endDate: string } | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const first = new Date(parsed.year, parsed.monthIndex, 1);
  const last = new Date(parsed.year, parsed.monthIndex + 1, 0);
  return {
    startDate: localDateInputValue(first),
    endDate: localDateInputValue(last),
  };
}

/** Inclusive grid span: leading/trailing days from adjacent months for Sun–Sat weeks. */
export function visibleGridRange(monthKey: string): { startDate: string; endDate: string } | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const first = new Date(parsed.year, parsed.monthIndex, 1);
  const last = new Date(parsed.year, parsed.monthIndex + 1, 0);
  const startPad = first.getDay();
  const gridStart = new Date(parsed.year, parsed.monthIndex, 1 - startPad);
  const endPad = 6 - last.getDay();
  const gridEnd = new Date(parsed.year, parsed.monthIndex + 1, 0 + endPad);
  return {
    startDate: localDateInputValue(gridStart),
    endDate: localDateInputValue(gridEnd),
  };
}

export function addMonths(monthKey: string, delta: number): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKeyFromDate(new Date());
  const d = new Date(parsed.year, parsed.monthIndex + delta, 1);
  return monthKeyFromDate(d);
}

export function formatMonthYearLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  const d = new Date(parsed.year, parsed.monthIndex, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
