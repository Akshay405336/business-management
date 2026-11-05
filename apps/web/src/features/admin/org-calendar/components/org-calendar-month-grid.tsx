'use client';

import type { OrgCalendarMonthDay } from '@techwin/contracts';
import { Pencil } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { localTodayKey, monthGridBoardWeeks } from '@/features/admin/attendance/utils/calendar-month';
import {
  attendanceCalendarTodayRingClass,
  resolveAttendanceCalendarDayCardStyle,
} from '@/features/admin/attendance/constants/attendance-calendar-theme';
import { ORG_CALENDAR_DAY_KIND_LABEL } from '../constants/org-calendar-event-types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function OrgCalendarMonthGrid({
  year,
  monthIndex,
  daysByDate,
  selectedDate,
  onSelectDate,
  onManageDate,
  canManageDate = false,
  orgTodayKey: orgTodayKeyProp,
  compact,
  canSelectDate,
  disabledDateTitle,
}: {
  year: number;
  monthIndex: number;
  daysByDate: Map<string, OrgCalendarMonthDay>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  onManageDate?: (dateKey: string) => void;
  canManageDate?: boolean;
  orgTodayKey?: string;
  compact?: boolean;
  canSelectDate?: (dateKey: string, day: OrgCalendarMonthDay | undefined) => boolean;
  disabledDateTitle?: (dateKey: string, day: OrgCalendarMonthDay | undefined) => string | undefined;
}) {
  const orgTodayKey = orgTodayKeyProp ?? localTodayKey();
  const weeks = monthGridBoardWeeks(year, monthIndex);

  return (
    <div className="min-w-0 rounded-xl bg-[#F8F9FC] p-1.5 sm:p-2">
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 px-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-2 sm:text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weeks.flat().map((cell) => {
          const day = daysByDate.get(cell.dateKey);
          const events = day?.events ?? [];
          const card = resolveAttendanceCalendarDayCardStyle({
            dateKey: cell.dateKey,
            organizationDayKind: day?.dayKind,
            isCurrentMonth: cell.inMonth,
            orgTodayKey,
          });
          const statusLabel = ORG_CALENDAR_DAY_KIND_LABEL[day?.dayKind ?? 'WORKING'] ?? 'Working day';
          const isToday = cell.dateKey === orgTodayKey;
          const isSelected = cell.dateKey === selectedDate;
          const dayNum = Number(cell.dateKey.slice(8, 10));
          const visible = events.slice(0, 2);
          const more = events.length - visible.length;
          const primaryTitle = events[0]?.title;
          const selectable = canSelectDate ? canSelectDate(cell.dateKey, day) : true;
          const disabledTitle = !selectable
            ? (disabledDateTitle?.(cell.dateKey, day) ??
              'This date is not available for leave selection.')
            : undefined;

          return (
            <div
              key={cell.dateKey}
              className={cn(
                'relative',
                compact ? 'min-h-[4.5rem] sm:min-h-[5rem]' : 'min-h-[5.25rem] sm:min-h-[6rem]',
                !cell.inMonth && 'opacity-80',
              )}
            >
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-lg border p-1.5 text-left transition duration-200 sm:rounded-xl sm:p-2',
                  selectable && 'shadow-sm hover:-translate-y-px hover:shadow-md',
                  !selectable && 'cursor-not-allowed opacity-55 saturate-75',
                  card.bg,
                  card.border,
                  card.text,
                  attendanceCalendarTodayRingClass(isToday, isSelected),
                  isSelected && !isToday && 'ring-2 ring-[#8B6BD6] ring-inset',
                )}
                title={disabledTitle}
              >
                <button
                  type="button"
                  className="absolute inset-0 z-0 rounded-xl"
                  aria-label={
                    selectable ? `Select ${cell.dateKey}` : `Unavailable: ${cell.dateKey}`
                  }
                  aria-disabled={!selectable}
                  disabled={!selectable}
                  onClick={() => {
                    if (selectable) onSelectDate(cell.dateKey);
                  }}
                />
                {canManageDate && onManageDate ? (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 z-10 rounded-md p-0.5 text-current/70 hover:bg-white/60 hover:text-current"
                    aria-label={`Manage ${cell.dateKey}`}
                    onClick={() => onManageDate(cell.dateKey)}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                ) : null}
                <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-1 py-0.5 text-sm font-bold tabular-nums leading-none sm:text-base',
                      card.dayNumberClass,
                      !cell.inMonth && 'opacity-80',
                    )}
                  >
                    {dayNum}
                  </span>
                  <p className="mt-0.5 line-clamp-1 pr-5 text-[9px] font-semibold uppercase tracking-wide opacity-90 sm:mt-1 sm:text-[10px]">
                    {statusLabel}
                  </p>
                  <div className="mt-auto flex flex-col gap-0.5 pt-1">
                    {primaryTitle ? (
                      <span className="line-clamp-1 text-[11px] font-medium leading-tight">
                        {primaryTitle}
                      </span>
                    ) : null}
                    {visible.slice(1).map((ev) => (
                      <span key={`${ev.id}-${ev.startDate}`} className="line-clamp-1 text-[10px] opacity-90">
                        {ev.title}
                      </span>
                    ))}
                    {more > 0 ? (
                      <span className="text-[10px] font-semibold opacity-75">+{more} more</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
