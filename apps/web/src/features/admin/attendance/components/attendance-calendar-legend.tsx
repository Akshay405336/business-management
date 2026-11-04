'use client';

import { OrgCalendarDayCardLegend } from '@/features/admin/shared/calendar/org-calendar-day-card-legend';
import {
  ATTENDANCE_CALENDAR_LEGEND,
  ATTENDANCE_STATUS_VISUAL,
} from '../constants/attendance-calendar-theme';

const POPUP_LEGEND = ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'] as const;
const BOARD_LEGEND = [...POPUP_LEGEND, 'WEEKLY_OFF'] as const;

const BOARD_TEXT_CLASS: Record<(typeof BOARD_LEGEND)[number], string> = {
  PRESENT: 'text-[#16A34A]',
  LATE: 'text-[#EA580C]',
  ABSENT: 'text-[#DC2626]',
  HALF_DAY: 'text-[#9333EA]',
  WEEKLY_OFF: 'text-[#6D28D9]',
};

export function AttendanceCalendarLegend({
  compact,
  popup,
  boardStyle,
}: {
  compact?: boolean;
  popup?: boolean;
  boardStyle?: boolean;
}) {
  const keys = compact || popup || boardStyle ? POPUP_LEGEND : ATTENDANCE_CALENDAR_LEGEND;

  if (boardStyle) {
    return (
      <div
        className="flex flex-col gap-2 border-b px-4 py-2.5 sm:px-5"
        style={{ borderColor: '#E8E8EF', backgroundColor: '#FFFFFF' }}
        aria-label="Calendar legend"
      >
        <OrgCalendarDayCardLegend />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">Counts</span>
          {BOARD_LEGEND.map((key) => (
            <span key={key} className={`text-[11px] font-semibold ${BOARD_TEXT_CLASS[key]}`}>
              {ATTENDANCE_STATUS_VISUAL[key].label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        popup
          ? 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-1.5 sm:px-5'
          : compact
            ? 'flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-3 py-2'
            : 'flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-5'
      }
      style={{ borderColor: '#E8E8EF', backgroundColor: '#FAFBFD' }}
      aria-label="Attendance status legend"
    >
      {keys.map((key) => {
        const visual = ATTENDANCE_STATUS_VISUAL[key];
        return (
          <div
            key={key}
            className={
              compact || popup
                ? 'flex items-center gap-1 text-[10px] text-[#475569]'
                : 'flex items-center gap-1.5 text-[11px] text-[#475569]'
            }
          >
            <span className={`size-2 rounded-full ${visual.dot}`} aria-hidden="true" />
            <span>{visual.label}</span>
          </div>
        );
      })}
    </div>
  );
}
