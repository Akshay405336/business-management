'use client';

import type { AttendanceRecordItem } from '@techwin/contracts';
import { Eye, SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { AttendanceResult } from '@/features/attendance/components/attendance-result';
import {
  formatAttendanceDate,
  formatAttendanceWorkingHours,
  formatIsoTime,
  weekdayLabel,
} from '@/features/attendance/utils/time';

export function AttendanceRecordsMobileList({
  items,
  selfScope = false,
  canCorrectRecords,
  onOpenDetail,
  onOpenEdit,
}: {
  items: readonly AttendanceRecordItem[];
  selfScope?: boolean;
  canCorrectRecords: boolean;
  onOpenDetail: (id: string) => void;
  onOpenEdit: (id: string) => void;
}) {
  return (
    <ul className="divide-border divide-y md:hidden">
      {items.map((row) => {
        const timeZone = row.scheduleSnapshot.timeZone;
        return (
          <li key={row.id}>
            <div
              role={selfScope ? undefined : 'button'}
              tabIndex={selfScope ? undefined : 0}
              className={
                selfScope
                  ? 'flex w-full gap-3 px-4 py-3 text-left sm:px-5'
                  : 'hover:bg-muted/40 flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors sm:px-5'
              }
              onClick={selfScope ? undefined : () => onOpenDetail(row.id)}
              onKeyDown={
                selfScope
                  ? undefined
                  : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenDetail(row.id);
                      }
                    }
              }
            >
              {selfScope ? null : (
                <EmployeeAvatar
                  displayName={row.employeeDisplayName}
                  profileImageUrl={row.profileImageUrl}
                />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                {selfScope ? null : (
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-foreground line-clamp-2 text-[13px] leading-snug font-semibold">
                        {row.employeeDisplayName}
                      </p>
                      <p className="text-muted-foreground truncate font-mono text-[10px]">
                        {row.employeeCode}
                      </p>
                    </div>
                    <AttendanceResult row={row} className="max-w-[50%] items-end" />
                  </div>
                )}
                <dl className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide">Date</dt>
                    <dd className="text-foreground tabular-nums">
                      {formatAttendanceDate(row.attendanceDate, timeZone)}
                    </dd>
                  </div>
                  {selfScope ? (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-wide">Day</dt>
                      <dd className="text-foreground">{weekdayLabel(row.attendanceDate, timeZone)}</dd>
                    </div>
                  ) : (
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-wide">Hours</dt>
                      <dd className="text-foreground tabular-nums">
                        {formatAttendanceWorkingHours(row.workingMinutes, row.punchInAt, row.punchOutAt)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide">In</dt>
                    <dd className="text-foreground tabular-nums">
                      {formatIsoTime(row.punchInAt, timeZone)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wide">Out</dt>
                    <dd className="text-foreground tabular-nums">
                      {formatIsoTime(row.punchOutAt, timeZone)}
                    </dd>
                  </div>
                  {selfScope ? (
                    <div className="col-span-2">
                      <dt className="text-[10px] font-medium uppercase tracking-wide">Hours</dt>
                      <dd className="text-foreground tabular-nums">
                        {formatAttendanceWorkingHours(row.workingMinutes, row.punchInAt, row.punchOutAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {selfScope ? <AttendanceResult row={row} className="mt-1" /> : null}
              </div>
              {selfScope ? null : (
                <div className="flex shrink-0 flex-col gap-0.5 self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-primary size-8"
                    aria-label={`View attendance for ${row.employeeDisplayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(row.id);
                    }}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                  </Button>
                  {canCorrectRecords ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                      aria-label={`Edit attendance for ${row.employeeDisplayName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenEdit(row.id);
                      }}
                    >
                      <SquarePen className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
