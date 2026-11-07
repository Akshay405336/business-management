'use client';

import type { LeaveTypeItem } from '@techwin/contracts';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { cn } from '@/shared/lib/utils';
import { sumAllocationDays } from '../utils/calculate-allocation-total';

const PIPELINE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

export type LeaveAllocationRow = {
  key: string;
  leaveTypeId: string;
  days: string;
};

export function LeaveAllocationEditor({
  rows,
  leaveTypes,
  typesLoading,
  pending,
  allowHalfDaySteps,
  formError,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: {
  rows: readonly LeaveAllocationRow[];
  leaveTypes: readonly LeaveTypeItem[];
  typesLoading: boolean;
  pending: boolean;
  allowHalfDaySteps: boolean;
  formError?: string | null;
  onAddRow: () => void;
  onRemoveRow: (key: string) => void;
  onUpdateRow: (key: string, patch: Partial<LeaveAllocationRow>) => void;
}) {
  const usedTypeIds = new Set(rows.map((row) => row.leaveTypeId).filter(Boolean));
  const totalDays = sumAllocationDays(rows.map((row) => row.days));

  return (
    <div className="grid gap-2 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-foreground text-sm font-semibold">Leave Allocations</h3>
          <p className="text-muted-foreground text-sm">
            Assign the number of entitled days for each leave type.
          </p>
        </div>
        {rows.length > 0 ? (
          <p className="text-foreground text-sm font-medium tabular-nums">
            Total: <span className="text-primary">{totalDays}</span> days
          </p>
        ) : null}
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
          <div
            className="text-muted-foreground hidden gap-2 text-xs font-medium sm:grid sm:grid-cols-[1fr_8rem_auto]"
            aria-hidden
          >
            <span>Leave Type</span>
            <span>Allocated Days</span>
            <span className="sr-only">Remove</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_8rem_auto]"
            >
              <div className="grid gap-1.5">
                <span className="sr-only">Leave type</span>
                <Select
                  value={row.leaveTypeId || undefined}
                  onValueChange={(value) => onUpdateRow(row.key, { leaveTypeId: value })}
                  disabled={pending}
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
                  disabled={pending}
                  className={CRM_PIPELINE_FORM_FIELD_CLASS}
                  onChange={(event) => onUpdateRow(row.key, { days: event.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 size-11 shrink-0"
                disabled={pending}
                aria-label="Remove allocation row"
                onClick={() => onRemoveRow(row.key)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      )}

      {leaveTypes.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          className={cn(PIPELINE_FORM_SECONDARY_BTN)}
          disabled={pending || rows.length >= leaveTypes.length}
          onClick={onAddRow}
        >
          <Plus className="size-4" aria-hidden />
          Add Leave Type
        </Button>
      ) : null}

      <CrmInlineFieldError message={formError ?? undefined} reserveSpace={false} />
    </div>
  );
}
