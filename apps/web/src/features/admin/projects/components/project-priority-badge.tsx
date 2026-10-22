import type { ProjectPriority } from '@/features/admin/projects/types';
import { labelProjectPriority } from '@/features/admin/projects/utils/labels';
import { cn } from '@/shared/lib/utils';

const priorityStyles: Record<ProjectPriority, string> = {
  LOW: 'border-slate-200 bg-slate-50 text-slate-700',
  MEDIUM: 'border-sky-200 bg-sky-50 text-sky-900',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-900',
  URGENT: 'border-red-200 bg-red-50 text-red-900',
};

export function ProjectPriorityBadge({
  priority,
  className,
}: {
  priority: ProjectPriority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
        priorityStyles[priority],
        className,
      )}
    >
      {labelProjectPriority(priority)}
    </span>
  );
}
