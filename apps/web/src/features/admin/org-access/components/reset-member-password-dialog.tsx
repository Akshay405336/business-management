'use client';

import { platformNewPasswordSchema, resetMemberPasswordRequestSchema } from '@techwin/validation';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
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
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  CRM_PIPELINE_FORM_FIELD_CLASS,
} from '@/features/admin/crm/constants';
import { CrmFieldLabel, CrmInlineFieldError } from '@/features/admin/crm/components/crm-feedback';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, mergeFieldErrors } from '@/shared/form/zod-field-error';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { cn } from '@/shared/lib/utils';
import { humanizeOrgAccessFieldError, mapOrgAccessZodFieldErrors } from '../utils/errors';
import type { OrgMemberListItem } from '../types';
import { PASSWORD_REQUIREMENTS, PasswordToggle } from './password-toggle';

const FORM_SECONDARY_BTN =
  'h-11 shrink-0 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

const FORM_PRIMARY_BTN =
  'border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 text-white shadow-xs hover:from-neutral-900 hover:via-neutral-700 hover:to-neutral-900';

const DIALOG_SHELL_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  'sm:w-[min(720px,calc(100vw-2rem))] sm:max-w-[720px]',
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

const FORM_ID = 'reset-member-password-form';

type ResetMemberPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Pick<OrgMemberListItem, 'displayName' | 'email'> | null;
  pending: boolean;
  apiFieldErrors?: Record<string, string>;
  onDismissApiFieldError?: (key: string) => void;
  onSubmit: (payload: z.infer<typeof resetMemberPasswordRequestSchema>) => Promise<void>;
};

function emptyForm() {
  return { password: '', confirmPassword: '' };
}

export function ResetMemberPasswordDialog({
  open,
  onOpenChange,
  member,
  pending,
  apiFieldErrors = {},
  onDismissApiFieldError,
  onSubmit,
}: ResetMemberPasswordDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fieldSchemas = useMemo(
    () => ({
      password: platformNewPasswordSchema,
      confirmPassword: z
        .string()
        .min(1, 'Confirm your new password.')
        .refine((value) => value === form.password, { message: 'Passwords do not match.' }),
    }),
    [form.password],
  );

  const liveFields = useZodFormFields(
    fieldSchemas,
    { password: form.password, confirmPassword: form.confirmPassword },
    { disabled: pending },
  );

  const fieldError = (key: keyof typeof fieldSchemas) => {
    const raw = mergeFieldErrors(liveFields.errors, { ...serverErrors, ...apiFieldErrors }, key);
    return raw ? humanizeOrgAccessFieldError(key, raw) : undefined;
  };

  const reset = () => {
    setForm(emptyForm());
    setServerErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    liveFields.reset();
  };

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setForm(emptyForm());
    setServerErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    liveFields.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset once per open
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerErrors({});
    liveFields.prepareSubmit();

    const parsed = resetMemberPasswordRequestSchema.safeParse({ password: form.password });
    if (!parsed.success) {
      setServerErrors(mapOrgAccessZodFieldErrors(parsed.error));
      focusFirstInvalidField();
      return;
    }

    if (form.confirmPassword !== form.password) {
      setServerErrors({ confirmPassword: 'Passwords do not match.' });
      focusFirstInvalidField();
      return;
    }

    try {
      await onSubmit(parsed.data);
      reset();
      onOpenChange(false);
    } catch {
      focusFirstInvalidField();
    }
  };

  const dismissFieldError = (key: string) => {
    clearFormFieldError(setServerErrors, key);
    onDismissApiFieldError?.(key);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className={DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            Reset password
          </DialogTitle>
        </DialogHeader>

        <form
          id={FORM_ID}
          noValidate
          className="min-h-0 flex-1 overflow-y-auto px-6 py-2"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-6">
            {member ? (
              <p className="text-muted-foreground text-sm leading-snug">
                Set a new password for{' '}
                <span className="text-foreground font-medium">{member.displayName}</span>
                {' · '}
                <span className="break-all">{member.email}</span>
                . They can sign in with this password on their existing account.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm leading-snug">
                Set a new password for this member. They can sign in with their existing account.
              </p>
            )}

            <div className="grid gap-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                New credentials
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="reset-password" required>
                    New password
                  </CrmFieldLabel>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={pending}
                      value={form.password}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        'pr-11',
                        formControlStateClass(liveFields.controlState('password')),
                      )}
                      {...liveFields.controlProps('password', 'reset-password')}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, password: event.target.value }));
                        dismissFieldError('password');
                      }}
                    />
                    <PasswordToggle
                      pressed={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                      disabled={pending}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs leading-snug">{PASSWORD_REQUIREMENTS}</p>
                  <CrmInlineFieldError message={fieldError('password')} reserveSpace={false} />
                </div>

                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="reset-confirm-password" required>
                    Confirm password
                  </CrmFieldLabel>
                  <div className="relative">
                    <Input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={pending}
                      value={form.confirmPassword}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        'pr-11',
                        formControlStateClass(liveFields.controlState('confirmPassword')),
                      )}
                      {...liveFields.controlProps('confirmPassword', 'reset-confirm-password')}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, confirmPassword: event.target.value }));
                        dismissFieldError('confirmPassword');
                      }}
                    />
                    <PasswordToggle
                      pressed={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                      disabled={pending}
                    />
                  </div>
                  <CrmInlineFieldError message={fieldError('confirmPassword')} reserveSpace={false} />
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className={cn('h-11 px-5', FORM_PRIMARY_BTN)}
            disabled={pending || !member}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Resetting…
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
