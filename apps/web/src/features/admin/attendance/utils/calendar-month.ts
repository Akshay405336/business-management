export function monthBounds(monthKey: string): { from: string; to: string; year: number; monthIndex: number } {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const month = String(monthIndex + 1).padStart(2, '0');
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
    year,
    monthIndex,
  };
}

export function monthKeyFromParts(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${m}`;
}

/** Inclusive year list centered on the anchor year (default: current calendar year). */
export function calendarYearOptions(anchorYear = new Date().getFullYear(), spread = 10): number[] {
  const years: number[] = [];
  for (let year = anchorYear - spread; year <= anchorYear + spread; year += 1) {
    years.push(year);
  }
  return years;
}

export const CALENDAR_MONTH_OPTIONS = Array.from({ length: 12 }, (_, monthIndex) => ({
  monthIndex,
  label: new Date(2000, monthIndex, 1).toLocaleDateString(undefined, { month: 'long' }),
}));

export function shiftMonth(monthKey: string, delta: number): string {
  const { year, monthIndex } = monthBounds(monthKey);
  const next = new Date(year, monthIndex + delta, 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function localTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateKeyFromParts(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export type CalendarBoardCell = { readonly dateKey: string; readonly inMonth: boolean };

/** Six full weeks (42 cells) with adjacent-month dates for a stable, scroll-free board. */
export function monthGridBoardWeeks(year: number, monthIndex: number): CalendarBoardCell[][] {
  const first = new Date(year, monthIndex, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarBoardCell[] = [];

  const prevMonthEnd = new Date(year, monthIndex, 0);
  const prevYear = prevMonthEnd.getFullYear();
  const prevMonthIndex = prevMonthEnd.getMonth();
  const prevMonthDays = prevMonthEnd.getDate();

  for (let i = startPad - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    cells.push({ dateKey: dateKeyFromParts(prevYear, prevMonthIndex, day), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ dateKey: dateKeyFromParts(year, monthIndex, day), inMonth: true });
  }

  let nextDay = 1;
  let nextMonthIndex = monthIndex + 1;
  let nextYear = year;
  if (nextMonthIndex > 11) {
    nextMonthIndex = 0;
    nextYear += 1;
  }

  while (cells.length < 42) {
    cells.push({ dateKey: dateKeyFromParts(nextYear, nextMonthIndex, nextDay), inMonth: false });
    nextDay += 1;
    if (nextDay > new Date(nextYear, nextMonthIndex + 1, 0).getDate()) {
      nextDay = 1;
      nextMonthIndex += 1;
      if (nextMonthIndex > 11) {
        nextMonthIndex = 0;
        nextYear += 1;
      }
    }
  }

  const weeks: CalendarBoardCell[][] = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthBoardVisibleRange(
  year: number,
  monthIndex: number,
): { from: string; to: string; year: number; monthIndex: number } {
  const weeks = monthGridBoardWeeks(year, monthIndex);
  const from = weeks[0]?.[0]?.dateKey ?? monthBounds(monthKeyFromParts(year, monthIndex)).from;
  const lastWeek = weeks[weeks.length - 1];
  const to = lastWeek?.[lastWeek.length - 1]?.dateKey ?? monthBounds(monthKeyFromParts(year, monthIndex)).to;
  return { from, to, year, monthIndex };
}

export function monthGridWeeks(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(monthIndex + 1).padStart(2, '0');
    cells.push(`${year}-${m}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
