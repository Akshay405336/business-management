export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDurationMinutes(total: number | null | undefined): string {
  if (total == null) return '—';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Working Hours column: 9h 30m, 8h 0m, or Not completed without punch-out. */
export function formatAttendanceWorkingHours(
  workingMinutes: number | null | undefined,
  punchInAt: string | null | undefined,
  punchOutAt: string | null | undefined,
): string {
  if (!punchInAt) return '—';
  if (!punchOutAt || workingMinutes == null) return 'Not completed';
  const hours = Math.floor(workingMinutes / 60);
  const minutes = workingMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/** Table and summary working hours (e.g. 08h 48m). */
export function formatWorkingHoursClock(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null) return '--';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/** Elapsed working time display (e.g. 00h 25m) from punch-in to now. */
export function formatElapsedWorking(isoStart: string, nowMs: number): string {
  const start = Date.parse(isoStart);
  if (!Number.isFinite(start)) return '—';
  const totalMinutes = Math.max(0, Math.floor((nowMs - start) / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function weekdayLabel(dateKey: string, timeZone?: string): string {
  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  return parsed.toLocaleDateString(undefined, { weekday: 'long', timeZone });
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const parsed = new Date(`${dateKey}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + deltaDays);
  return parsed.toISOString().slice(0, 10);
}

export function formatIsoTime(iso: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '0';
  let hour = Number(read('hour'));
  if (hour === 24) hour = 0;
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value;
  if (dayPeriod) {
    hour = (hour % 12) + (/^p/i.test(dayPeriod) ? 12 : 0);
  }
  const minute = Number(read('minute'));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatAttendanceDate(date: string, timeZone?: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

export function formatLateDuration(minutes: number): string {
  if (minutes <= 0) return 'Not late';
  return formatSpokenDuration(minutes);
}

/** Compact duration used in the attendance result, e.g. "30 min", "1 hr", "1 hr 30 min". */
export function formatSpokenDuration(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export function monthRange(date = new Date()): { from: string; to: string } {
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
