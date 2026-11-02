'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CrmFormField, formGridClass } from '@/features/admin/crm/components/crm-feedback';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import {
  PASSWORD_REQUIREMENTS,
  PasswordToggle,
} from '@/features/admin/org-access/components/password-toggle';
import { formControlStateClass } from '@/shared/form/form-control-state';
import { cn } from '@/shared/lib/utils';
import type { EmployeeLoginAccess } from '@techwin/contracts';

function fieldClass(invalid: boolean) {
  return cn(CRM_PIPELINE_FORM_FIELD_CLASS, formControlStateClass(invalid ? 'invalid' : 'neutral'));
}

export type EmployeeLoginFormValues = {
  readonly loginEnabled: boolean;
  readonly password: string;
  readonly confirmPassword: string;
};

/** Create-only: optional sign-in account (initial password) for the new employee. */
export function EmployeeLoginAccessFields({
  value,
  disabled,
  fieldError,
  onChange,
}: {
  value: EmployeeLoginFormValues;
  disabled?: boolean;
  fieldError: (key: string) => string | undefined;
  onChange: (patch: Partial<EmployeeLoginFormValues>, field: keyof EmployeeLoginFormValues) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="border-border/60 grid gap-3 rounded-lg border p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={value.loginEnabled}
          disabled={disabled}
          aria-label="Allow this employee to sign in"
          onCheckedChange={(checked) =>
            onChange(
              checked === true
                ? { loginEnabled: true }
                : { loginEnabled: false, password: '', confirmPassword: '' },
              'loginEnabled',
            )
          }
        />
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Allow sign-in</span>
          <span className="text-muted-foreground text-xs leading-snug">
            Creates a login for the work email with the Employee role. The employee signs in on the
            normal login page.
          </span>
        </span>
      </label>
      {fieldError('loginEnabled') ? (
        <p className="text-destructive text-xs">{fieldError('loginEnabled')}</p>
      ) : null}

      {value.loginEnabled ? (
        <div className={formGridClass}>
          <CrmFormField id="emp-login-password" label="Password" required error={fieldError('password')}>
            <div className="relative">
              <Input
                id="emp-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={disabled}
                value={value.password}
                className={cn(fieldClass(Boolean(fieldError('password'))), 'pr-11')}
                onChange={(event) => onChange({ password: event.target.value }, 'password')}
              />
              <PasswordToggle
                pressed={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                disabled={disabled}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-snug">{PASSWORD_REQUIREMENTS}</p>
          </CrmFormField>
          <CrmFormField
            id="emp-login-confirm-password"
            label="Confirm password"
            required
            error={fieldError('confirmPassword')}
          >
            <div className="relative">
              <Input
                id="emp-login-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={disabled}
                value={value.confirmPassword}
                className={cn(fieldClass(Boolean(fieldError('confirmPassword'))), 'pr-11')}
                onChange={(event) =>
                  onChange({ confirmPassword: event.target.value }, 'confirmPassword')
                }
              />
              <PasswordToggle
                pressed={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                disabled={disabled}
              />
            </div>
          </CrmFormField>
        </div>
      ) : null}
    </div>
  );
}

/** Edit: the linked login's role, shown read-only; roles are managed from Users. */
export function EmployeeRoleField({ loginAccess }: { loginAccess: EmployeeLoginAccess }) {
  const roleNames = loginAccess.roles.map((role) => role.name).join(', ') || 'No role';

  return (
    <CrmFormField id="emp-role" label="Role">
      <Input
        id="emp-role"
        value={roleNames}
        readOnly
        disabled
        className={CRM_PIPELINE_FORM_FIELD_CLASS}
      />
    </CrmFormField>
  );
}
