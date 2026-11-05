'use client';

import type { LeaveTypeItem } from '@techwin/contracts';
import {
  createLeaveTypeRequestSchema,
  updateLeaveTypeRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { createLeaveType, updateLeaveType } from '@/features/leave/api/leave-api';
import { cn } from '@/shared/lib/utils';

const PIPELINE_FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const PIPELINE_FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const PIPELINE_DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

/** Derive a unique-style code from the display name (API requires a code; not shown in UI). */
function deriveLeaveCodeFromName(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  if (base.length >= 1) return base;
  return `LT_${Date.now().toString(36).slice(-8).toUpperCase()}`;
}

export function LeaveTypeFormDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editing: LeaveTypeItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const isCreate = editing === null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
    } else {
      setName('');
      setDescription('');
    }
    setFieldErrors({});
  }, [open, editing]);

  const handleSubmit = useCallback(async () => {
    if (isCreate) {
      const body = {
        name,
        description,
        code: deriveLeaveCodeFromName(name),
        appliesToAllEmployees: true,
        applicableEmployeeIds: [] as string[],
        applicableDepartments: [] as string[],
      };
      const parsed = createLeaveTypeRequestSchema.safeParse(body);
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await run(() => createLeaveType(parsed.data as Parameters<typeof createLeaveType>[0]));
        toast.success('Leave type created.');
        onOpenChange(false);
        await onSaved();
      } catch (failure) {
        toast.error(describeCrmError(failure));
      }
      return;
    }

    if (!editing) return;
    const parsed = updateLeaveTypeRequestSchema.safeParse({ name, description });
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      await run(() => updateLeaveType(editing.id, parsed.data));
      toast.success('Leave type updated.');
      onOpenChange(false);
      await onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  }, [name, description, isCreate, editing, run, toast, onSaved, onOpenChange]);

  const nameError = fieldErrors.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={PIPELINE_DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {isCreate ? 'Create Leave Type' : 'Edit Leave Type'}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-4 pb-2">
            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-type-name" required={isCreate}>
                Name
              </CrmFieldLabel>
              <Input
                id="leave-type-name"
                placeholder="Casual Leave"
                value={name}
                disabled={pending}
                aria-invalid={Boolean(nameError)}
                className={cn(
                  CRM_PIPELINE_FORM_FIELD_CLASS,
                  formControlStateClass(nameError ? 'invalid' : 'neutral'),
                )}
                onChange={(event) => {
                  setName(event.target.value);
                  clearFormFieldError(setFieldErrors, 'name');
                }}
              />
              <CrmInlineFieldError message={nameError} reserveSpace={false} />
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-type-desc">Description</CrmFieldLabel>
              <Textarea
                id="leave-type-desc"
                placeholder="Optional policy summary for admins and employees"
                value={description}
                disabled={pending}
                rows={3}
                className={cn(CRM_PIPELINE_FORM_TEXTAREA_CLASS, 'min-h-[6.5rem] max-h-40 resize-y')}
                onChange={(event) => setDescription(event.target.value)}
              />
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
            disabled={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create leave type'
            ) : (
              'Save leave type'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
