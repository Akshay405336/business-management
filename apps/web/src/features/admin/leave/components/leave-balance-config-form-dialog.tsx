'use client';

import type { LeaveTypeItem, LeaveYearConfigurationItem } from '@techwin/contracts';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
} from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import {
  createLeaveBalanceConfiguration,
  listLeaveTypes,
  updateLeaveBalanceConfiguration,
} from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';

const PIPELINE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PIPELINE_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

type AllocationRow = {
  key: string;
  leaveTypeId: string;
  days: string;
};

function newRowKey(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidDays(value: string, allowHalf: boolean): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return allowHalf ? /^\d+(\.5)?$/.test(trimmed) : /^\d+$/.test(trimmed);
}

export function LeaveBalanceConfigFormDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editing: LeaveYearConfigurationItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const isCreate = editing === null;
  const lockedAllocations = Boolean(editing?.balancesGeneratedAt);

  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<readonly LeaveTypeItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const allowHalfDaySteps = useMemo(
    () => leaveTypes.some((type) => type.halfDayAllowed),
    [leaveTypes],
  );

  const usedTypeIds = useMemo(
    () => new Set(rows.map((row) => row.leaveTypeId).filter(Boolean)),
    [rows],
  );

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await listLeaveTypes({
        page: 1,
        pageSize: 100,
        status: 'ACTIVE',
        includeInactive: false,
      });
      setLeaveTypes(res.items);
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setTypesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void loadTypes();
    setFormError(null);
    if (editing) {
      setName(editing.name);
      setEffectiveFrom(editing.yearStartDate);
      setEffectiveTo(editing.yearEndDate);
      setRows(
        (editing.allocations ?? []).map((line) => ({
          key: newRowKey(),
          leaveTypeId: line.leaveTypeId,
          days: line.annualAllocationDays,
        })),
      );
    } else {
      setName('');
      setEffectiveFrom('');
      setEffectiveTo('');
      setRows([]);
    }
  }, [open, editing, loadTypes]);

  const addRow = () => {
    setRows((current) => [...current, { key: newRowKey(), leaveTypeId: '', days: '' }]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: string, patch: Partial<AllocationRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const submit = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Enter a name.');
      return;
    }
    if (!effectiveFrom || !effectiveTo) {
      setFormError('Select effective from and to dates.');
      return;
    }
    if (effectiveTo < effectiveFrom) {
      setFormError('Effective To must be on or after Effective From.');
      return;
    }
    if (!lockedAllocations) {
      if (rows.length === 0) {
        setFormError('Add at least one leave type allocation.');
        return;
      }
      for (const row of rows) {
        if (!row.leaveTypeId) {
          setFormError('Select a leave type for each row.');
          return;
        }
        if (!isValidDays(row.days, allowHalfDaySteps)) {
          setFormError(
            allowHalfDaySteps
              ? 'Enter valid allocated days (half-day steps allowed).'
              : 'Enter valid whole-day allocations.',
          );
          return;
        }
      }
      const unique = new Set(rows.map((row) => row.leaveTypeId));
      if (unique.size !== rows.length) {
        setFormError('Each leave type can only be added once.');
        return;
      }
    }

    const allocations = rows.map((row) => ({
      leaveTypeId: row.leaveTypeId,
      annualAllocationDays: row.days.trim(),
    }));

    try {
      if (isCreate) {
        await run(() =>
          createLeaveBalanceConfiguration({
            name: name.trim(),
            yearStartDate: effectiveFrom,
            yearEndDate: effectiveTo,
            allocations,
          }),
        );
        toast.success('Leave balance configuration created.');
      } else {
        await run(() =>
          updateLeaveBalanceConfiguration(editing.id, {
            name: name.trim(),
            yearStartDate: lockedAllocations ? undefined : effectiveFrom,
            yearEndDate: lockedAllocations ? undefined : effectiveTo,
            allocations: lockedAllocations ? undefined : allocations,
          }),
        );
        toast.success('Leave balance configuration updated.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create Leave Balance' : 'Edit Leave Balance'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 pb-2">
            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-balance-name" required>
                Name
              </CrmFieldLabel>
              <Input
                id="leave-balance-name"
                placeholder="e.g. 2027 Employee Leave Policy"
                value={name}
                disabled={pending}
                className={CRM_PIPELINE_FORM_FIELD_CLASS}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="leave-balance-from" required>
                  Effective From
                </CrmFieldLabel>
                <Input
                  id="leave-balance-from"
                  type="date"
                  value={effectiveFrom}
                  disabled={pending || lockedAllocations}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <CrmFieldLabel htmlFor="leave-balance-to" required>
                  Effective To
                </CrmFieldLabel>
                <Input
                  id="leave-balance-to"
                  type="date"
                  value={effectiveTo}
                  disabled={pending || lockedAllocations}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </div>
            </div>

            {lockedAllocations ? (
              <p className="text-muted-foreground text-sm">
                Employee balances were already generated for this configuration. You can update the
                name only; allocations and dates are locked.
              </p>
            ) : null}

            <div className="grid gap-2 border-t border-border/60 pt-4">
              <div>
                <h3 className="text-foreground text-sm font-semibold">Leave Allocations</h3>
                <p className="text-muted-foreground text-sm">
                  Assign the number of entitled days for each leave type.
                </p>
              </div>

              {typesLoading ? (
                <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading leave types…
                </p>
              ) : leaveTypes.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
                  <p>No active leave types yet.</p>
                  <Link
                    href="/admin/leave-types"
                    className="text-primary mt-2 inline-block font-medium hover:underline"
                  >
                    Manage leave types
                  </Link>
                </div>
              ) : rows.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">No leave types added yet.</p>
              ) : (
                <div className="grid gap-2">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_8rem_auto]"
                    >
                      <div className="grid gap-1.5">
                        <span className="sr-only">Leave type</span>
                        <Select
                          value={row.leaveTypeId || undefined}
                          onValueChange={(value) => updateRow(row.key, { leaveTypeId: value })}
                          disabled={pending || lockedAllocations}
                        >
                          <SelectTrigger className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent>
                            {leaveTypes.map((type) => (
                              <SelectItem
                                key={type.id}
                                value={type.id}
                                disabled={usedTypeIds.has(type.id) && type.id !== row.leaveTypeId}
                              >
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <span className="sr-only">Allocated days</span>
                        <Input
                          type="number"
                          min={0}
                          step={allowHalfDaySteps ? 0.5 : 1}
                          placeholder="Days"
                          value={row.days}
                          disabled={pending || lockedAllocations}
                          className={CRM_PIPELINE_FORM_FIELD_CLASS}
                          onChange={(event) => updateRow(row.key, { days: event.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 size-11 shrink-0"
                        disabled={pending || lockedAllocations}
                        aria-label="Remove allocation row"
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!lockedAllocations && leaveTypes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className={PIPELINE_FORM_SECONDARY_BTN}
                  disabled={pending || rows.length >= leaveTypes.length}
                  onClick={addRow}
                >
                  <Plus className="size-4" aria-hidden />
                  Add Leave Type
                </Button>
              ) : null}

              <CrmInlineFieldError message={formError ?? undefined} reserveSpace={false} />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={PIPELINE_FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', PIPELINE_FORM_PRIMARY_BTN)}
            disabled={pending || (leaveTypes.length === 0 && isCreate)}
            onClick={() => void submit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create Leave Balance'
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
