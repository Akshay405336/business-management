'use client';

import type { AttendanceRecordDetail } from '@techwin/contracts';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { EmployeeAvatar } from '@/features/employees/components/employee-avatar';
import { AttendanceStatusBadge } from '@/features/attendance/components/attendance-status-badge';
import {
  formatAttendanceDate,
  formatDurationMinutes,
  formatIsoTime,
  formatLateDuration,
  minutesToLabel,
} from '@/features/attendance/utils/time';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-border/60 py-3 last:border-0">
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-foreground text-sm">{children}</dd>
    </div>
  );
}

export function AttendanceRecordDetailSheet({
  open,
  onOpenChange,
  detail,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AttendanceRecordDetail | null;
  loading: boolean;
}) {
  const timeZone = detail?.scheduleSnapshot.timeZone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <div className="border-border border-b px-6 py-4 text-left">
          <SheetTitle>Attendance details</SheetTitle>
          <SheetDescription className="mt-1">
            Punch times and status for this record. Device fields appear when captured at punch time.
          </SheetDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
            </div>
          ) : detail ? (
            <>
              <div className="mb-4 flex items-center gap-3 pt-2">
                <EmployeeAvatar displayName={detail.employeeDisplayName} className="size-11" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{detail.employeeDisplayName}</p>
                  <p className="text-muted-foreground text-sm">{detail.employeeCode}</p>
                </div>
              </div>
              <dl>
                <DetailRow label="Date">
                  {formatAttendanceDate(detail.attendanceDate, timeZone)}
                </DetailRow>
                <DetailRow label="Status">
                  <AttendanceStatusBadge status={detail.status} />
                </DetailRow>
                <DetailRow label="Punch in">
                  {formatIsoTime(detail.punchInAt, timeZone)}
                </DetailRow>
                <DetailRow label="Punch out">
                  {formatIsoTime(detail.punchOutAt, timeZone)}
                </DetailRow>
                <DetailRow label="Working hours">
                  {formatDurationMinutes(detail.workingMinutes)}
                </DetailRow>
                <DetailRow label="Late by">{formatLateDuration(detail.lateMinutes)}</DetailRow>
                <DetailRow label="Office schedule (snapshot)">
                  {minutesToLabel(detail.scheduleSnapshot.officeStartMinutes)} –{' '}
                  {minutesToLabel(detail.scheduleSnapshot.officeEndMinutes)}
                  <span className="text-muted-foreground block text-xs">{timeZone}</span>
                </DetailRow>
                {detail.punchInUserAgent || detail.punchInIp ? (
                  <DetailRow label="Punch-in device">
                    {detail.punchInIp ? <span className="block">IP: {detail.punchInIp}</span> : null}
                    {detail.punchInUserAgent ? (
                      <span className="text-muted-foreground block break-all text-xs">
                        {detail.punchInUserAgent}
                      </span>
                    ) : null}
                  </DetailRow>
                ) : null}
                {detail.punchOutUserAgent || detail.punchOutIp ? (
                  <DetailRow label="Punch-out device">
                    {detail.punchOutIp ? <span className="block">IP: {detail.punchOutIp}</span> : null}
                    {detail.punchOutUserAgent ? (
                      <span className="text-muted-foreground block break-all text-xs">
                        {detail.punchOutUserAgent}
                      </span>
                    ) : null}
                  </DetailRow>
                ) : null}
                {detail.corrections.length > 0 ? (
                  <DetailRow label="Corrections">
                    <ul className="grid gap-2 pt-1">
                      {detail.corrections.map((c) => (
                        <li key={c.id} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                          <p className="font-medium">{new Date(c.createdAt).toLocaleString()}</p>
                          <p className="text-muted-foreground mt-0.5">{c.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </DetailRow>
                ) : null}
              </dl>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
