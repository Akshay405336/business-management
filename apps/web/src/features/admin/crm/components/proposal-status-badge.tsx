import type { ProposalStatus } from '@/features/admin/crm/types';
import { labelProposalStatus } from '@/features/admin/crm/utils/labels';
import { cn } from '@/shared/lib/utils';

const statusStyles: Record<ProposalStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-800',
  SENT: 'border-blue-200 bg-blue-100 text-blue-900',
  ACCEPTED: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  REJECTED: 'border-red-200 bg-red-100 text-red-900',
  EXPIRED: 'border-amber-200 bg-amber-100 text-amber-900',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
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
      {labelProposalStatus(status)}
    </span>
  );
}
