'use client';

import {
  optionalLeadPhoneInputSchema,
  PLATFORM_PASSWORD_MIN_LENGTH,
  provisionMemberRequestSchema,
  safeParseProvisionMemberRequest,
} from '@techwin/validation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  humanizeOrgAccessFieldError,
  mapOrgAccessZodFieldErrors,
  orgAccessZodHasSchemaContractError,
} from '../utils/errors';
import { ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR } from '../utils/org-access-form-errors';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { cn } from '@/shared/lib/utils';
import type { OrgRoleListItem } from '../types';

const CREATE_ACCOUNT_FORM_ID = 'create-member-account-form';

const PASSWORD_REQUIREMENTS = `At least ${PLATFORM_PASSWORD_MIN_LENGTH} characters with upper- and lower-case letters, a digit, and a symbol.`;

type CreateMemberAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantableRoles: readonly OrgRoleListItem[];
  pending: boolean;
  apiFieldErrors?: Record<string, string>;
  onDismissApiFieldError?: (key: string) => void;
  onSubmit: (payload: z.infer<typeof provisionMemberRequestSchema>) => Promise<void>;
  onSchemaContractError?: (message: string) => void;
};

function emptyForm() {
  return {
    displayName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    roleIds: [] as string[],
  };
}

export function CreateMemberAccountDialog({
  open,
  onOpenChange,
  grantableRoles,
  pending,
  apiFieldErrors = {},
  onDismissApiFieldError,
  onSubmit,
  onSchemaContractError,
}: CreateMemberAccountDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fieldSchemas = useMemo(
    () => ({
      displayName: provisionMemberRequestSchema.shape.displayName,
      email: provisionMemberRequestSchema.shape.email,
      phone: optionalLeadPhoneInputSchema,
      password: provisionMemberRequestSchema.shape.password,
      confirmPassword: z
        .string()
        .min(1, 'Confirm your password.')
        .refine((value) => value === form.password, { message: 'Passwords do not match.' }),
      roleIds: provisionMemberRequestSchema.shape.roleIds,
    }),
    [form.password],
  );

  const liveFields = useZodFormFields(fieldSchemas, {
    displayName: form.displayName,
    email: form.email,
    phone: form.phone,
    password: form.password,
    confirmPassword: form.confirmPassword,
    roleIds: form.roleIds,
  }, { disabled: pending });

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

  const selectedRoles = useMemo(
    () => grantableRoles.filter((role) => form.roleIds.includes(role.id)),
    [form.roleIds, grantableRoles],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerErrors({});
    liveFields.prepareSubmit();

    const parsed = safeParseProvisionMemberRequest({
      email: form.email,
      displayName: form.displayName,
      phone: form.phone.trim() ? form.phone : null,
      password: form.password,
      roleIds: [...form.roleIds],
    });
    if (!parsed.success) {
      if (orgAccessZodHasSchemaContractError(parsed.error)) {
        onSchemaContractError?.(ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR);
      }
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
      onOpenChange(false);
    } catch {
      focusFirstInvalidField();
    }
  };

  const roleListScrollable = grantableRoles.length > 6;

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
      <DialogContent className="flex max-h-[90vh] max-w-none w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(960px,calc(100vw-64px))] sm:max-w-none">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-3 text-left">
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Create login credentials and assign roles. The member uses the same sign-in page as everyone else.
          </DialogDescription>
        </DialogHeader>

        <form
          id={CREATE_ACCOUNT_FORM_ID}
          noValidate
          className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <div className="grid gap-5">
              <CrmFormField
                id="create-display-name"
                label="Full name"
                required
                validated
                error={fieldError('displayName')}
              >
                <Input
                  id="create-display-name"
                  autoComplete="name"
                  disabled={pending}
                  value={form.displayName}
                  className={formControlStateClass(liveFields.controlState('displayName'))}
                  {...liveFields.controlProps('displayName', 'create-display-name')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, displayName: event.target.value }));
                    dismissFieldError('displayName');
                  }}
                />
              </CrmFormField>

              <CrmFormField
                id="create-email"
                label="Email"
                required
                validated
                error={fieldError('email')}
              >
                <Input
                  id="create-email"
                  type="email"
                  autoComplete="email"
                  disabled={pending}
                  value={form.email}
                  className={formControlStateClass(liveFields.controlState('email'))}
                  {...liveFields.controlProps('email', 'create-email')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, email: event.target.value }));
                    dismissFieldError( 'email');
                  }}
                />
              </CrmFormField>

              <CrmFormField
                id="create-phone"
                label="Phone number"
                optional
                validated
                error={fieldError('phone')}
              >
                <Input
                  id="create-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={pending}
                  placeholder="10-digit mobile (optional)"
                  value={form.phone}
                  className={formControlStateClass(liveFields.controlState('phone'))}
                  {...liveFields.controlProps('phone', 'create-phone')}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, phone: event.target.value }));
                    dismissFieldError( 'phone');
                  }}
                />
              </CrmFormField>

              <CrmFormField
                id="create-password"
                label="Password"
                required
                validated
                error={fieldError('password')}
              >
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={pending}
                    value={form.password}
                    className={cn(formControlStateClass(liveFields.controlState('password')), 'pr-11')}
                    {...liveFields.controlProps('password', 'create-password')}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, password: event.target.value }));
                      dismissFieldError( 'password');
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
            </div>

            <div className="grid gap-5">
              <CrmFormField
                id="create-confirm-password"
                label="Confirm password"
                required
                validated
                error={fieldError('confirmPassword')}
              >
                <div className="relative">
                  <Input
                    id="create-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={pending}
                    value={form.confirmPassword}
                    className={cn(
                      formControlStateClass(liveFields.controlState('confirmPassword')),
                      'pr-11',
                    )}
                    {...liveFields.controlProps('confirmPassword', 'create-confirm-password')}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }));
                      dismissFieldError( 'confirmPassword');
                    }}
                  />
                  <PasswordToggle
                    pressed={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                    disabled={pending}
                  />
                </div>
              </CrmFormField>

              <CrmFormField
                id="create-role-ids"
                label="Assigned roles"
                required
                validated
                error={fieldError('roleIds')}
              >
                <fieldset
                  className="min-w-0"
                  onBlur={(event) => {
                    const nextFocus = event.relatedTarget;
                    if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
                      liveFields.touch('roleIds');
                    }
                  }}
                >
                  <legend className="sr-only">Assigned roles</legend>
                  <p className="text-muted-foreground mb-2 text-xs leading-snug">
                    Choose one or more organization roles this member can use after sign-in. Only roles you are
                    allowed to assign are listed.
                  </p>
                  {selectedRoles.length > 0 ? (
                    <div className="mb-2 flex min-w-0 flex-wrap gap-1" aria-live="polite">
                      {selectedRoles.map((role) => (
                        <Badge key={role.id} variant="secondary" className="max-w-full truncate text-xs font-normal">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mb-2 text-xs">No roles selected yet.</p>
                  )}
                  <div
                    className={cn(
                      'grid gap-1.5 rounded-md border p-2',
                      roleListScrollable && 'max-h-44 overflow-y-auto',
                    )}
                  >
                    {grantableRoles.length === 0 ? (
                      <p className="text-muted-foreground px-1 py-2 text-sm">No assignable roles are available.</p>
                    ) : (
                      grantableRoles.map((role) => {
                        const checked = form.roleIds.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="hover:bg-muted/50 focus-within:bg-muted/50 flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 py-1.5"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={pending}
                              onCheckedChange={(value) => {
                                setForm((current) => {
                                  if (value === true) {
                                    return current.roleIds.includes(role.id)
                                      ? current
                                      : { ...current, roleIds: [...current.roleIds, role.id] };
                                  }
                                  return { ...current, roleIds: current.roleIds.filter((id) => id !== role.id) };
                                });
                                dismissFieldError( 'roleIds');
                              }}
                              aria-label={role.name}
                            />
                            <span className="min-w-0 truncate text-sm font-medium">{role.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </fieldset>
              </CrmFormField>

              <p className="text-muted-foreground text-xs leading-snug">
                Link employee records from the Employees module after the account is created.
              </p>
            </div>
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t px-5 py-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={CREATE_ACCOUNT_FORM_ID} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create account'
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
