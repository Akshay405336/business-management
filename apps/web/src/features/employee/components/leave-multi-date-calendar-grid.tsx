'use client';

import type { OrgCalendarDayKind, OrgCalendarMonthDay } from '@techwin/contracts';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { monthGridBoardWeeks } from '@/features/admin/attendance/utils/calendar-month';
import {
  attendanceCalendarTodayRingClass,
  ATTENDANCE_DATE_CARD_LEGEND,
  resolveAttendanceCalendarDayCardStyle,
} from '@/features/admin/attendance/constants/attendance-calendar-theme';
import { ORG_CALENDAR_DAY_KIND_LABEL } from '@/features/admin/org-calendar/constants/org-calendar-event-types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function statusLabelForDay(day: OrgCalendarMonthDay | undefined): string {
  if (!day) return ORG_CALENDAR_DAY_KIND_LABEL.WORKING ?? 'Working day';
  return ORG_CALENDAR_DAY_KIND_LABEL[day.dayKind] ?? 'Working day';
}

function primaryReasonForDay(day: OrgCalendarMonthDay | undefined): string | null {
  if (!day?.events?.length) return null;
  const active = day.events.filter((e) => e.isActive);
  const primary = active[0];
  if (!primary?.title?.trim()) return null;
  return primary.title.trim();
}

function tooltipForCell(
  dateKey: string,
  day: OrgCalendarMonthDay | undefined,
  selectable: boolean,
  disabledTitle: string,
): string {
  const parts: string[] = [dateKey];
  const reason = primaryReasonForDay(day);
  if (reason) parts.push(reason);
  if (!selectable) parts.push(disabledTitle);
  return parts.join(' · ');
}

export function LeaveMultiDateCalendarGrid({
  year,
  monthIndex,
  daysByDate,
  selectedDates,
  orgTodayKey,
  canSelectDate,
  disabledDateTitle,
  onToggleDate,
}: {
  year: number;
  monthIndex: number;
  daysByDate: Map<string, OrgCalendarMonthDay>;
  selectedDates: ReadonlySet<string>;
  orgTodayKey: string;
  canSelectDate: (dateKey: string, day: OrgCalendarMonthDay | undefined) => boolean;
  disabledDateTitle: (dateKey: string, day: OrgCalendarMonthDay | undefined) => string;
  onToggleDate: (dateKey: string) => void;
}) {
  const weeks = monthGridBoardWeeks(year, monthIndex);

  return (
    <div className="min-w-0 rounded-xl bg-[#F8F9FC] p-1.5 sm:p-2">
      <div className="mb-1.5 grid grid-cols-7 gap-1 px-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-0.5">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weeks.flat().map((cell) => {
          const day = daysByDate.get(cell.dateKey);
          const card = resolveAttendanceCalendarDayCardStyle({
            dateKey: cell.dateKey,
            organizationDayKind: day?.dayKind,
            isCurrentMonth: cell.inMonth,
            orgTodayKey,
          });
          const dayNum = Number(cell.dateKey.slice(8, 10));
          const isSelected = selectedDates.has(cell.dateKey);
          const selectable = canSelectDate(cell.dateKey, day);
          const isToday = cell.dateKey === orgTodayKey;
          const statusLabel = statusLabelForDay(day);
          const reason = primaryReasonForDay(day);
          const title = tooltipForCell(
            cell.dateKey,
            day,
            selectable,
            disabledDateTitle(cell.dateKey, day),
          );

          return (
            <div
              key={cell.dateKey}
              className={cn(
                'relative min-h-[4.25rem] sm:min-h-[4.75rem]',
                !cell.inMonth && card.mutedContent && 'opacity-75',
              )}
            >
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-lg border p-1 text-left transition duration-200 sm:rounded-xl sm:p-1.5',
                  card.bg,
                  card.border,
                  card.text,
                  selectable && 'shadow-sm hover:-translate-y-px hover:shadow-md',
                  !selectable && 'cursor-not-allowed opacity-90',
                  isSelected && 'ring-2 ring-[#8B6BD6] ring-inset',
                  attendanceCalendarTodayRingClass(isToday, isSelected),
                )}
                title={title}
              >
                <button
                  type="button"
                  className="absolute inset-0 z-0 rounded-xl"
                  aria-pressed={isSelected}
                  aria-label={
                    selectable
                      ? `${cell.dateKey}${reason ? `, ${reason}` : ''}${isSelected ? ', selected' : ''}`
                      : `Unavailable: ${title}`
                  }
                  disabled={!selectable}
                  onClick={() => {
                    if (selectable) onToggleDate(cell.dateKey);
                  }}
                />
                {isSelected ? (
                  <span className="absolute right-1 top-1 z-10 flex size-4 items-center justify-center rounded-full bg-[#8B6BD6] text-white shadow-sm">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                <div className="pointer-events-none relative z-[1] flex min-h-0 flex-1 flex-col">
                  <span
                    className={cn(
                      'inline-flex w-fit rounded-md px-1 py-0.5 text-xs font-bold tabular-nums leading-none sm:text-sm',
                      card.dayNumberClass,
                      !cell.inMonth && 'opacity-80',
                    )}
                  >
                    {dayNum}
                  </span>
                  <p className="mt-0.5 line-clamp-1 pr-4 text-[8px] font-semibold uppercase tracking-wide opacity-90 sm:text-[9px]">
                    {statusLabel}
                  </p>
                  {reason ? (
                    <span className="mt-auto line-clamp-2 text-[9px] font-medium leading-tight opacity-95 sm:text-[10px]">
                      {reason}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LeaveMultiDateCalendarLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
      {ATTENDANCE_DATE_CARD_LEGEND.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className={cn('size-3 rounded border', item.sampleClass)} aria-hidden />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-3 rounded border border-[#8B6BD6] bg-[#8B6BD6]/15 ring-1 ring-[#8B6BD6]/40"
          aria-hidden
        />
        Selected
      </span>
    </div>
  );
}

export function isLeaveCalendarWorkingKind(kind: OrgCalendarDayKind | undefined): boolean {
  return kind === 'WORKING' || kind === 'SPECIAL_WORKING' || kind === 'HALF_DAY';
}
