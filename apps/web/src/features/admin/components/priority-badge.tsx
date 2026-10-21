import type { LeadPriority } from '@/features/admin/crm/types';
import { labelLeadPriority } from '@/features/admin/crm/utils/labels';
import { cn } from '@/shared/lib/utils';

const priorityStyles: Record<LeadPriority, string> = {
  URGENT: 'border-red-700/20 bg-red-600 text-white',
  HIGH: 'border-orange-200 bg-orange-100 text-orange-900',
  MEDIUM: 'border-blue-200 bg-blue-100 text-blue-900',
  LOW: 'border-emerald-200 bg-emerald-100 text-emerald-900',
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority;
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
      {labelLeadPriority(priority)}
    </span>
  );
}
