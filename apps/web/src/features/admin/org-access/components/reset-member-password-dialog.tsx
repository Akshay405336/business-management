'use client';

import {
  PLATFORM_PASSWORD_MIN_LENGTH,
  platformNewPasswordSchema,
  resetMemberPasswordRequestSchema,
} from '@techwin/validation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, mergeFieldErrors } from '@/shared/form/zod-field-error';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { cn } from '@/shared/lib/utils';
import { humanizeOrgAccessFieldError, mapOrgAccessZodFieldErrors } from '../utils/errors';
import type { OrgMemberListItem } from '../types';

const FORM_ID = 'reset-member-password-form';

const PASSWORD_REQUIREMENTS = `At least ${PLATFORM_PASSWORD_MIN_LENGTH} characters with upper- and lower-case letters, a digit, and a symbol.`;

type ResetMemberPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrgMemberListItem | null;
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for this user. They can use it to sign in with their existing account.
          </DialogDescription>
        </DialogHeader>
        {member ? (
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-medium">{member.displayName}</span>
            {' · '}
            {member.email}
          </p>
        ) : null}
        <form id={FORM_ID} className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <CrmFormField
            id="reset-password"
            label="New Password"
            required
            validated
            error={fieldError('password')}
          >
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={pending}
                value={form.password}
                className={cn(formControlStateClass(liveFields.controlState('password')), 'pr-11')}
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
          </CrmFormField>

          <CrmFormField
            id="reset-confirm-password"
            label="Confirm New Password"
            required
            validated
            error={fieldError('confirmPassword')}
          >
            <div className="relative">
              <Input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={pending}
                value={form.confirmPassword}
                className={cn(
                  formControlStateClass(liveFields.controlState('confirmPassword')),
                  'pr-11',
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
          </CrmFormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending || !member}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Resetting…
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordToggle({
  pressed,
  onToggle,
  disabled,
}: {
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
      aria-label={pressed ? 'Hide password' : 'Show password'}
    >
      {pressed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  );
}
