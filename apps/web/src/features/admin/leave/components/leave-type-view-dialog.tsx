'use client';

import type { LeaveTypeItem } from '@techwin/contracts';
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-[#F1F5F9] py-2 last:border-0">
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  );
}

export function LeaveTypeViewDialog({
  open,
  item,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  item: LeaveTypeItem | null;
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
          <dl>
            <Row label="Code" value={item.code} />
            <Row label="Description" value={item.description || '—'} />
            <Row label="Paid / unpaid" value={item.isPaid ? 'Paid' : 'Unpaid'} />
            <Row
              label="Attachment"
              value={item.attachmentRequired ? 'Required' : 'Optional'}
            />
            <Row label="Minimum notice (days)" value={item.minApplicationDays} />
            <Row
              label="Max consecutive days"
              value={
                item.maxConsecutiveDays !== null && item.maxConsecutiveDays !== undefined
                  ? String(item.maxConsecutiveDays)
                  : '—'
              }
            />
            <Row
              label="Eligibility"
              value={item.appliesToAllEmployees ? 'All employees' : 'Restricted'}
            />
            <div className="grid gap-0.5 py-2">
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Status
              </dt>
              <dd>
                {item.status === 'ACTIVE' ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </dd>
            </div>
          </dl>
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
