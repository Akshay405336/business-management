import type { AttendanceStatus } from '@techwin/contracts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/lib/utils';

const STYLES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  LATE: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  ABSENT: 'bg-red-500/15 text-red-700 dark:text-red-300',
  HALF_DAY: 'bg-yellow-500/15 text-yellow-900 dark:text-yellow-200',
  ON_LEAVE: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  HOLIDAY: 'bg-muted text-muted-foreground border-border',
  WEEKLY_OFF: 'bg-muted text-muted-foreground',
  PENDING: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

export function AttendanceStatusBadge({
  status,
  className,
}: {
  status: AttendanceStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', STYLES[status], className)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}
