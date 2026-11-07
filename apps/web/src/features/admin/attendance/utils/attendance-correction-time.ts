import type { Time12Parts } from './attendance-settings-time';
import { minutesToTime12, time12ToMinutes } from './attendance-settings-time';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  minutesFromMidnight: number;
};

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function hourFromZonedParts(parts: Intl.DateTimeFormatPart[]): number {
  const read = (type: Intl.DateTimeFormatPartTypes): string | undefined =>
    parts.find((part) => part.type === type)?.value;
  const rawHour = Number(read('hour') ?? '0');
  const hour = rawHour === 24 ? 0 : rawHour;
  const dayPeriod = read('dayPeriod');
  if (!dayPeriod) return hour;
  const isPm = /^p/i.test(dayPeriod);
  return (hour % 12) + (isPm ? 12 : 0);
}

export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0';
  const hour = hourFromZonedParts(parts);
  const minute = Number(read('minute'));
  return {
    year: Number(read('year')),
    month: Number(read('month')),
    day: Number(read('day')),
    minutesFromMidnight: hour * 60 + minute,
  };
}

export function isoToTime12(iso: string | null, timeZone: string): Time12Parts | null {
  if (!iso) return null;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const zoned = getZonedParts(instant, timeZone);
  return minutesToTime12(zoned.minutesFromMidnight);
}

export function instantFromDateAndTime12(
  attendanceDate: string,
  time: Time12Parts,
  timeZone: string,
): string {
  const targetMinutes = time12ToMinutes(time);
  const anchor = new Date(`${attendanceDate}T12:00:00.000Z`);
  let instant = anchor;
  for (let attempt = 0; attempt < 8; attempt++) {
    const zoned = getZonedParts(instant, timeZone);
    const currentDate = `${zoned.year}-${String(zoned.month).padStart(2, '0')}-${String(zoned.day).padStart(2, '0')}`;
    const diffMinutes =
      targetMinutes -
      zoned.minutesFromMidnight +
      (attendanceDate > currentDate ? 24 * 60 : attendanceDate < currentDate ? -24 * 60 : 0);
    if (diffMinutes === 0 && currentDate === attendanceDate) {
      return instant.toISOString();
    }
    instant = new Date(instant.getTime() + diffMinutes * 60_000);
  }
  return instant.toISOString();
}

export function formatWeekdayLabel(attendanceDate: string, timeZone: string): string {
  const anchor = new Date(`${attendanceDate}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'long' }).format(anchor);
}

export { weekdayMap };
