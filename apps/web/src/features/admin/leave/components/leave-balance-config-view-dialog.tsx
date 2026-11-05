'use client';

import type { LeaveYearConfigurationItem } from '@techwin/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';

function statusBadge(status: LeaveYearConfigurationItem['status']) {
  if (status === 'ACTIVE') {
    return (
      <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Inactive
    </Badge>
  );
}

export function LeaveBalanceConfigViewDialog({
  open,
  item,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  item: LeaveYearConfigurationItem | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          CRM_PIPELINE_FORM_DIALOG_CLASS,
          'sm:max-w-[560px] [&>button]:top-5 [&>button]:right-5',
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-2 text-left">
          <DialogTitle className="pr-8">{item.name}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          <dl className="grid gap-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-2">
              <dt className="text-muted-foreground font-medium">Status</dt>
              <dd>{statusBadge(item.status)}</dd>
            </div>
            <div className="grid gap-0.5 border-b border-[#F1F5F9] pb-2">
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Effective period
              </dt>
              <dd className="text-foreground">
                {item.yearStartDate} → {item.yearEndDate}
              </dd>
            </div>
            <div className="grid gap-0.5 border-b border-[#F1F5F9] pb-2">
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Total allocated days
              </dt>
              <dd className="text-foreground tabular-nums">{item.totalAllocatedDays}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <h3 className="text-foreground mb-2 text-sm font-semibold">Leave allocations</h3>
            <ul className="divide-border divide-y rounded-lg border">
              {(item.allocations ?? []).map((line) => (
                <li
                  key={line.leaveTypeId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium">{line.leaveTypeName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {line.annualAllocationDays} days
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={onEdit}>
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
