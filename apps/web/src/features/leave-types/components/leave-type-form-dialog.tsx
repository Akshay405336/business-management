'use client';

import type { LeaveTypeItem, LeaveTypeKind } from '@techwin/contracts';
import {
  createLeaveTypeRequestSchema,
  updateLeaveTypeRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodIssuesToFieldMap } from '@/shared/form/zod-field-error';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CRM_PIPELINE_DIALOG_BODY_CLASS,
  CRM_PIPELINE_DIALOG_FOOTER_CLASS,
  CRM_PIPELINE_DIALOG_HEADER_CLASS,
  CRM_PIPELINE_DIALOG_SHELL_CLASS,
  CRM_PIPELINE_DIALOG_TITLE_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
  CRM_PIPELINE_PRIMARY_BUTTON_CLASS,
  CRM_PIPELINE_SECONDARY_BUTTON_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { cn } from '@/shared/lib/utils';
import { useCreateLeaveType, useUpdateLeaveType } from '../hooks';
import { previewLeaveTypeCode } from '../utils/leave-type-code-preview';

export function LeaveTypeFormDialog({
  open,
  editing,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  editing: LeaveTypeItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const toast = useAdminToast();
  const { createLeaveType, pending: createPending } = useCreateLeaveType();
  const { updateLeaveType, pending: updatePending } = useUpdateLeaveType();
  const pending = createPending || updatePending;
  const isCreate = editing === null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<LeaveTypeKind>('PAID');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? '');
      setKind(editing.kind);
    } else {
      setName('');
      setDescription('');
      setKind('PAID');
    }
    setFieldErrors({});
  }, [open, editing]);

  const codePreview = useMemo(
    () => (isCreate ? previewLeaveTypeCode(name) : editing?.code ?? ''),
    [editing?.code, isCreate, name],
  );

  const handleSubmit = useCallback(async () => {
    if (isCreate) {
      const parsed = createLeaveTypeRequestSchema.safeParse({
        name,
        description,
        kind,
      });
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await createLeaveType(parsed.data);
        toast.success('Leave type created.');
        onOpenChange(false);
        onSaved();
      } catch (failure) {
        toast.error(describeCrmError(failure));
      }
      return;
    }

    if (!editing) return;
    const parsed = updateLeaveTypeRequestSchema.safeParse({
      name,
      description,
      kind,
    });
    if (!parsed.success) {
      setFieldErrors(zodIssuesToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      await updateLeaveType(editing.id, parsed.data);
      toast.success('Leave type updated.');
      onOpenChange(false);
      onSaved();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  }, [createLeaveType, description, editing, isCreate, kind, name, onOpenChange, onSaved, toast, updateLeaveType]);

  const nameError = fieldErrors.name;
  const descriptionError = fieldErrors.description;
  const kindError = fieldErrors.kind;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={CRM_PIPELINE_DIALOG_SHELL_CLASS}>
        <DialogHeader className={CRM_PIPELINE_DIALOG_HEADER_CLASS}>
          <DialogTitle className={CRM_PIPELINE_DIALOG_TITLE_CLASS}>
            {isCreate ? 'Create leave type' : 'Edit leave type'}
          </DialogTitle>
        </DialogHeader>

        <div className={CRM_PIPELINE_DIALOG_BODY_CLASS}>
          <div className="grid gap-4 pb-2">
            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-type-name" required>
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
              {codePreview ? (
                <p className="text-muted-foreground text-xs">
                  Code: <span className="text-foreground font-medium">{codePreview}</span>
                  {isCreate ? null : ' (kept when the name changes)'}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-type-kind" required>
                Type
              </CrmFieldLabel>
              <Select
                value={kind}
                disabled={pending}
                onValueChange={(value) => {
                  setKind(value as LeaveTypeKind);
                  clearFormFieldError(setFieldErrors, 'kind');
                }}
              >
                <SelectTrigger
                  id="leave-type-kind"
                  aria-invalid={Boolean(kindError)}
                  className={cn(
                    CRM_PIPELINE_FORM_FIELD_CLASS,
                    formControlStateClass(kindError ? 'invalid' : 'neutral'),
                  )}
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <CrmInlineFieldError message={kindError} reserveSpace={false} />
            </div>

            <div className="grid gap-2">
              <CrmFieldLabel htmlFor="leave-type-desc">Description</CrmFieldLabel>
              <Textarea
                id="leave-type-desc"
                placeholder="Optional summary for admins and employees"
                value={description}
                disabled={pending}
                rows={3}
                aria-invalid={Boolean(descriptionError)}
                className={cn(
                  CRM_PIPELINE_FORM_TEXTAREA_CLASS,
                  formControlStateClass(descriptionError ? 'invalid' : 'neutral'),
                )}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFormFieldError(setFieldErrors, 'description');
                }}
              />
              <CrmInlineFieldError message={descriptionError} reserveSpace={false} />
            </div>
          </div>
        </div>

        <DialogFooter className={CRM_PIPELINE_DIALOG_FOOTER_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={CRM_PIPELINE_SECONDARY_BUTTON_CLASS}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn('h-11 px-5', CRM_PIPELINE_PRIMARY_BUTTON_CLASS)}
            disabled={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create Leave Type'
            ) : (
              'Save leave type'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
