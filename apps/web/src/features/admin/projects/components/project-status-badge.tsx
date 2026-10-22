import type { ProjectStatus } from '@/features/admin/projects/types';
import { labelProjectStatus } from '@/features/admin/projects/utils/labels';
import { cn } from '@/shared/lib/utils';

const statusStyles: Record<ProjectStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  INACTIVE: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  ON_HOLD: 'border-amber-200 bg-amber-100 text-amber-900',
  COMPLETED: 'border-blue-200 bg-blue-100 text-blue-900',
  CANCELLED: 'border-red-200 bg-red-100 text-red-900',
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        statusStyles[status],
        className,
      )}
    >
      {labelProjectStatus(status)}
    </span>
  );
}
