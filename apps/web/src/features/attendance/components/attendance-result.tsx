import type { AttendanceRecordItem } from '@techwin/contracts';
import { cn } from '@/shared/lib/utils';
import { attendanceResultLines } from '../utils/attendance-result';
import { AttendanceStatusBadge } from './attendance-status-badge';

export function AttendanceResult({
  row,
  className,
}: {
  row: AttendanceRecordItem;
  className?: string;
}) {
  const lines = attendanceResultLines({
    status: row.status,
    earlyMinutes: row.earlyMinutes ?? 0,
    lateMinutes: row.lateMinutes,
    leftEarlyMinutes: row.leftEarlyMinutes ?? 0,
    stayedLateMinutes: row.stayedLateMinutes ?? 0,
    workingMinutes: row.workingMinutes,
    punchInAt: row.punchInAt,
    punchOutAt: row.punchOutAt,
  });
  return (
    <div className={cn('flex min-w-0 flex-col items-start gap-0.5', className)}>
      <AttendanceStatusBadge status={row.status} className="max-w-full truncate px-1.5 py-0 text-[10px] leading-4" />
      {lines.punchIn ? (
        <p className="text-muted-foreground max-w-full text-[10px] leading-tight">Punch in: {lines.punchIn}</p>
      ) : null}
      {lines.punchOut ? (
        <p className="text-muted-foreground max-w-full text-[10px] leading-tight">Punch out: {lines.punchOut}</p>
      ) : null}
    </div>
  );
}
