'use client';

import type { OrgCalendarMonthDay } from '@techwin/contracts';
import { cn } from '@/shared/lib/utils';
import { resolveAttendanceCalendarDayCardStyle } from '@/features/admin/attendance/constants/attendance-calendar-theme';

export function DailyTaskOrgDayBadge({
  dateKey,
  day,
  orgTodayKey,
  className,
}: {
  dateKey: string;
  day: OrgCalendarMonthDay | undefined;
  orgTodayKey: string;
  className?: string;
}) {
  const style = resolveAttendanceCalendarDayCardStyle({
    dateKey,
    organizationDayKind: day?.dayKind,
    isCurrentMonth: true,
    orgTodayKey,
  });
  if (style.variant === 'pastWorking' || style.variant === 'upcomingWorking') return null;
  const label =
    day?.events[0]?.title?.trim() ??
    (style.variant === 'holiday'
      ? 'Holiday'
      : style.variant === 'weeklyOff'
        ? 'Weekly off'
        : style.variant === 'outsideMonth'
          ? null
          : 'Organisation calendar');
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex max-w-none min-w-0 shrink-0 items-center whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold',
        style.bg,
        style.border,
        style.text,
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}
