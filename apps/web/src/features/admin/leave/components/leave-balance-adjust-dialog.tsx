'use client';

import type { EmployeeLeaveBalanceItem } from '@techwin/contracts';
import { adjustEmployeeLeaveBalanceRequestSchema } from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { adjustEmployeeLeaveBalance } from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';

export function LeaveBalanceAdjustDialog({
  open,
  balance,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  balance: EmployeeLeaveBalanceItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [days, setDays] = useState('1');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!balance) return null;

  const submit = async () => {
    const parsed = adjustEmployeeLeaveBalanceRequestSchema.safeParse({ direction, days, reason });
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      return;
    }
    try {
      await run(() => adjustEmployeeLeaveBalance(balance.id, parsed.data));
      toast.success('Balance adjusted.');
      setReason('');
      await onSaved();
      onOpenChange(false);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(CRM_PIPELINE_FORM_DIALOG_CLASS, 'sm:max-w-[480px]')}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Adjust leave balance</DialogTitle>
          <p className="text-muted-foreground text-sm">
            {balance.employeeDisplayName || 'Employee'} · {balance.leaveTypeName} ·{' '}
            {balance.calendarYear}
          </p>
        </DialogHeader>
        <div className="grid gap-3 px-6 py-2">
          <div className={CRM_PIPELINE_FORM_FIELD_CLASS}>
            <CrmFieldLabel>Direction</CrmFieldLabel>
            <Select value={direction} onValueChange={(v) => setDirection(v as 'CREDIT' | 'DEBIT')}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREDIT">Credit (add days)</SelectItem>
                <SelectItem value="DEBIT">Debit (remove days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={CRM_PIPELINE_FORM_FIELD_CLASS}>
            <CrmFieldLabel htmlFor="adj-days">Days</CrmFieldLabel>
            <Input id="adj-days" value={days} onChange={(e) => setDays(e.target.value)} />
            <CrmInlineFieldError message={fieldErrors.days} />
          </div>
          <div className={CRM_PIPELINE_FORM_FIELD_CLASS}>
            <CrmFieldLabel htmlFor="adj-reason" required>
              Reason
            </CrmFieldLabel>
            <Textarea
              id="adj-reason"
              className={CRM_PIPELINE_FORM_TEXTAREA_CLASS}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <CrmInlineFieldError message={fieldErrors.reason} />
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
