'use client';

import type { LeaveYearAllocationItem, LeaveYearConfigurationItem } from '@techwin/contracts';
import {
  createLeaveYearAllocationRequestSchema,
  updateLeaveYearAllocationRequestSchema,
} from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAdminToast } from '@/features/admin/components/toast';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import {
  createLeaveAllocation,
  listLeaveTypes,
  updateLeaveAllocation,
} from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';
import { zodIssuesToFieldMap } from '@/shared/form/zod-field-error';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:max-w-[640px] [&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const ACCRUAL_OPTIONS = [
  { value: 'ANNUAL_FULL', label: 'Annual (full)' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PRORATED_JOIN', label: 'Prorated (join date)' },
  { value: 'NONE', label: 'None' },
] as const;

type AccrualValue = (typeof ACCRUAL_OPTIONS)[number]['value'];

export function LeaveAllocationFormDialog({
  open,
  yearConfiguration,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  yearConfiguration: LeaveYearConfigurationItem;
  editing: LeaveYearAllocationItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const isCreate = editing === null;

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [annualAllocationDays, setAnnualAllocationDays] = useState('0');
  const [accrualMethod, setAccrualMethod] = useState<AccrualValue>('ANNUAL_FULL');
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(false);
  const [maxCarryForwardDays, setMaxCarryForwardDays] = useState('0');
  const [effectiveFrom, setEffectiveFrom] = useState(yearConfiguration.yearStartDate);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string; code: string }[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const result = await listLeaveTypes({ page: 1, pageSize: 100, status: 'ACTIVE' });
      setLeaveTypes(result.items.map((t) => ({ id: t.id, name: t.name, code: t.code })));
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setTypesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void loadTypes();
    setFieldErrors({});
    if (editing) {
      setLeaveTypeId(editing.leaveTypeId);
      setAnnualAllocationDays(editing.annualAllocationDays);
      setAccrualMethod(editing.accrualMethod);
      setCarryForwardEnabled(editing.carryForwardEnabled);
      setMaxCarryForwardDays(editing.maxCarryForwardDays);
      setEffectiveFrom(editing.effectiveFrom);
      setEffectiveTo(editing.effectiveTo ?? '');
      setIsActive(editing.isActive);
    } else {
      setLeaveTypeId('');
      setAnnualAllocationDays('0');
      setAccrualMethod('ANNUAL_FULL');
      setCarryForwardEnabled(false);
      setMaxCarryForwardDays('0');
      setEffectiveFrom(yearConfiguration.yearStartDate);
      setEffectiveTo('');
      setIsActive(true);
    }
  }, [open, editing, yearConfiguration.yearStartDate, loadTypes]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const effectiveToValue = effectiveTo.trim() ? effectiveTo.trim() : null;
    if (isCreate) {
      const parsed = createLeaveYearAllocationRequestSchema.safeParse({
        leaveYearConfigurationId: yearConfiguration.id,
        leaveTypeId,
        annualAllocationDays,
        accrualMethod,
        carryForwardEnabled,
        maxCarryForwardDays,
        eligibility: 'ALL_EMPLOYEES',
        effectiveFrom,
        effectiveTo: effectiveToValue,
        isActive,
      });
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldMap(parsed.error));
        return;
      }
      setFieldErrors({});
      try {
        await run(() => createLeaveAllocation(parsed.data));
        toast.success('Allocation created.');
        onOpenChange(false);
        await onSaved();
      } catch (failure) {
        toast.error(describeCrmError(failure));
      }
      return;
    }

    const parsed = updateLeaveYearAllocationRequestSchema.safeParse({
      leaveTypeId,
      annualAllocationDays,
      accrualMethod,
      carryForwardEnabled,
      maxCarryForwardDays,
      effectiveFrom,
      effectiveTo: effectiveToValue,
      isActive,
    });
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      return;
    }
    setFieldErrors({});
    try {
      await run(() => updateLeaveAllocation(editing.id, parsed.data));
      toast.success('Allocation updated.');
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4">
          <DialogTitle className="text-lg font-semibold">
            {isCreate ? 'Create allocation' : 'Edit allocation'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-1.5">
              <CrmFieldLabel htmlFor="alloc-leave-type">Leave type</CrmFieldLabel>
              <Select
                value={leaveTypeId || undefined}
                onValueChange={setLeaveTypeId}
                disabled={typesLoading || !isCreate}
              >
                <SelectTrigger id="alloc-leave-type" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                  <SelectValue placeholder={typesLoading ? 'Loading…' : 'Select leave type'} />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={fieldErrors.leaveTypeId} />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <CrmFieldLabel htmlFor="alloc-days">Annual days</CrmFieldLabel>
                <Input
                  id="alloc-days"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={annualAllocationDays}
                  onChange={(e) => setAnnualAllocationDays(e.target.value)}
                />
                <CrmInlineFieldError message={fieldErrors.annualAllocationDays} />
              </div>
              <div className="grid gap-1.5">
                <CrmFieldLabel htmlFor="alloc-accrual">Accrual</CrmFieldLabel>
                <Select
                  value={accrualMethod}
                  onValueChange={(v) => setAccrualMethod(v as AccrualValue)}
                >
                  <SelectTrigger id="alloc-accrual" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCRUAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="alloc-carry"
                checked={carryForwardEnabled}
                onCheckedChange={(v) => setCarryForwardEnabled(v === true)}
              />
              <label htmlFor="alloc-carry" className="text-sm font-normal">
                Carry forward enabled
              </label>
            </div>
            {carryForwardEnabled ? (
              <div className="grid gap-1.5">
                <CrmFieldLabel htmlFor="alloc-max-carry">Max carry-forward days</CrmFieldLabel>
                <Input
                  id="alloc-max-carry"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={maxCarryForwardDays}
                  onChange={(e) => setMaxCarryForwardDays(e.target.value)}
                />
                <CrmInlineFieldError message={fieldErrors.maxCarryForwardDays} />
              </div>
            ) : null}
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <CrmFieldLabel htmlFor="alloc-from">Effective from</CrmFieldLabel>
                <Input
                  id="alloc-from"
                  type="date"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
                <CrmInlineFieldError message={fieldErrors.effectiveFrom} />
              </div>
              <div className="grid gap-1.5">
                <CrmFieldLabel htmlFor="alloc-to">Effective to (optional)</CrmFieldLabel>
                <Input
                  id="alloc-to"
                  type="date"
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                />
                <CrmInlineFieldError message={fieldErrors.effectiveTo} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="alloc-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              <label htmlFor="alloc-active" className="text-sm font-normal">
                Active
              </label>
            </div>
          </div>
          <DialogFooter className="border-border shrink-0 border-t px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className={PRIMARY_BTN} disabled={pending || typesLoading}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {isCreate ? 'Create allocation' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
