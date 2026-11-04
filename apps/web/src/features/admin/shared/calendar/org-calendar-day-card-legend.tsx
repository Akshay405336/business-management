'use client';

import { cn } from '@/shared/lib/utils';
import { ATTENDANCE_DATE_CARD_LEGEND } from '@/features/admin/attendance/constants/attendance-calendar-theme';

export function OrgCalendarDayCardLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}
      aria-label="Calendar date legend"
    >
      <span className="text-[10px] font-semibold tracking-wide text-[#64748B] uppercase">Dates</span>
      {ATTENDANCE_DATE_CARD_LEGEND.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5 text-[11px] text-[#475569]">
          <span className={cn('size-3 shrink-0 rounded-sm border', item.sampleClass)} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
