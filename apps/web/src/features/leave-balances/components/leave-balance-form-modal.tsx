'use client';

import type { LeaveTypeItem, LeaveYearConfigurationItem } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
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
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmFieldLabel } from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
} from '@/features/admin/crm/constants';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { listLeaveTypes } from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';
import {
  createLeaveBalanceConfiguration,
  updateLeaveBalanceConfiguration,
} from '../api/leave-balances.api';
import {
  LeaveAllocationEditor,
  type LeaveAllocationRow,
} from './leave-allocation-editor';

const PIPELINE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PIPELINE_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const DIALOG_SHELL = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

function newRowKey(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidDays(value: string, allowHalf: boolean): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return allowHalf ? /^\d+(\.5)?$/.test(trimmed) : /^\d+$/.test(trimmed);
}

export function LeaveBalanceFormModal({
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

  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [rows, setRows] = useState<LeaveAllocationRow[]>([]);
  const [activeLeaveTypes, setActiveLeaveTypes] = useState<readonly LeaveTypeItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const allowHalfDaySteps = true;

  const selectableLeaveTypes = useMemo(() => {
    const byId = new Map(activeLeaveTypes.map((type) => [type.id, type]));
    for (const line of editing?.allocations ?? []) {
      if (byId.has(line.leaveTypeId)) continue;
      byId.set(line.leaveTypeId, {
        id: line.leaveTypeId,
        name: line.leaveTypeName,
        code: line.leaveTypeId.slice(0, 8),
        description: null,
        kind: 'PAID',
        status: 'INACTIVE',
        createdAt: '',
        updatedAt: '',
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [activeLeaveTypes, editing]);

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await listLeaveTypes({
        page: 1,
        pageSize: 100,
        status: 'ACTIVE',
      });
      setActiveLeaveTypes(res.items);
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

  const updateRow = (key: string, patch: Partial<LeaveAllocationRow>) => {
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
            yearStartDate: effectiveFrom,
            yearEndDate: effectiveTo,
            allocations,
          }),
        );
        toast.success('Leave balance configuration updated.');
      }
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      const message = describeCrmError(failure);
      setFormError(message);
      toast.error(message);
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
                  disabled={pending}
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
                  disabled={pending}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </div>
            </div>

            <LeaveAllocationEditor
              rows={rows}
              leaveTypes={selectableLeaveTypes}
              typesLoading={typesLoading}
              pending={pending}
              allowHalfDaySteps={allowHalfDaySteps}
              formError={formError}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              onUpdateRow={updateRow}
            />
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
            disabled={pending || (selectableLeaveTypes.length === 0 && isCreate)}
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
