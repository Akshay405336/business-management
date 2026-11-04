'use client';

import { ATTENDANCE_CALENDAR_LEGEND, ATTENDANCE_STATUS_VISUAL } from '../constants/attendance-calendar-theme';

const POPUP_LEGEND = ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'] as const;
const BOARD_LEGEND = [...POPUP_LEGEND, 'WEEKLY_OFF'] as const;

const BOARD_TEXT_CLASS: Record<(typeof BOARD_LEGEND)[number], string> = {
  PRESENT: 'text-[#16A34A]',
  LATE: 'text-[#CA8A04]',
  ABSENT: 'text-[#DC2626]',
  HALF_DAY: 'text-[#9333EA]',
  WEEKLY_OFF: 'text-[#64748B]',
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
        className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-5"
        style={{ borderColor: '#E8E8EF', backgroundColor: '#FFFFFF' }}
        aria-label="Attendance status legend"
      >
        {BOARD_LEGEND.map((key) => (
          <span key={key} className={`text-[11px] font-semibold ${BOARD_TEXT_CLASS[key]}`}>
            {ATTENDANCE_STATUS_VISUAL[key].label}
          </span>
        ))}
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
