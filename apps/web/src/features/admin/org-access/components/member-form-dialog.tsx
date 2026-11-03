'use client';

import type { CatalogOptionGroup, CatalogSelection } from '@techwin/catalog';
import {
  optionalLeadPhoneInputSchema,
  provisionMemberRequestSchema,
  safeParseProvisionMemberRequest,
  updateMemberRequestSchema,
} from '@techwin/validation';
import type { EmployeeListItem } from '@techwin/contracts';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
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
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { cn } from '@/shared/lib/utils';
import { formatDateTime } from '@/shared/lib/format';
import type { OrgMemberListItem, OrgRoleListItem, OrganizationMembershipStatus } from '../types';
import { humanizeOrgAccessFieldError, mapOrgAccessZodFieldErrors, orgAccessZodHasSchemaContractError } from '../utils/errors';
import { ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR } from '../utils/org-access-form-errors';
import { labelMembershipStatus } from '../utils/labels';
import { MEMBERSHIP_STATUSES } from '../constants';
import { listAccountLinkableEmployees } from '@/features/admin/employees/api/employees';
import { roleSelectionIsEmployeeRole } from '../utils/employee-role-selection';
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

const CREATE_FORM_ID = 'member-form-create';
const EDIT_FORM_ID = 'member-form-edit';

type CreateFormState = {
  displayName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  roleId: string;
  employeeId: string;
};

type EditFormState = {
  displayName: string;
  phone: string;
  roleIds: string[];
  status: OrganizationMembershipStatus;
};

function emptyCreateForm(): CreateFormState {
  return {
    displayName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    roleId: '',
    employeeId: '',
  };
}

function employeeCatalogGroups(
  employees: readonly EmployeeListItem[],
): readonly CatalogOptionGroup[] {
  if (employees.length === 0) return [];
  return [
    {
      category: 'Employees without sign-in',
      options: employees.map((employee) => ({
        id: employee.id,
        label: employee.displayName,
        category: `${employee.employeeCode}${employee.workEmail ? ` · ${employee.workEmail}` : ''}`,
      })),
    },
  ];
}

function memberToEditForm(member: OrgMemberListItem): EditFormState {
  return {
    displayName: member.displayName,
    phone: member.phoneNumber ?? '',
    roleIds: member.roles.map((role) => role.id),
    status: member.status === 'ACTIVE' || member.status === 'SUSPENDED' ? member.status : 'ACTIVE',
  };
}

function roleCatalogGroups(roles: readonly OrgRoleListItem[]): readonly CatalogOptionGroup[] {
  if (roles.length === 0) return [];
  return [
    {
      category: 'Organization roles',
      options: roles.map((role) => ({
        id: role.id,
        label: role.name,
        category: role.description.trim() || (role.isSystem ? 'System role' : 'Custom role'),
      })),
    },
  ];
}

function selectionsFromRoleIds(
  roleIds: readonly string[],
  catalog: readonly OrgRoleListItem[],
): CatalogSelection[] {
  return roleIds.map((id) => {
    const role = catalog.find((item) => item.id === id);
    return {
      id,
      label: role?.name ?? id,
      category: role?.description.trim() || 'Role',
    };
  });
}

export function MemberFormDialog({
  mode,
  open,
  member,
  grantableRoles,
  allRoles,
  pending,
  readOnly = false,
  canManageRoles = false,
  canChangeStatus = false,
  apiFieldErrors = {},
  onDismissApiFieldError,
  onOpenChange,
  onCreateSubmit,
  onEditSubmit,
  onSchemaContractError,
}: {
  mode: 'create' | 'edit' | 'view';
  open: boolean;
  member: OrgMemberListItem | null;
  grantableRoles: readonly OrgRoleListItem[];
  allRoles: readonly OrgRoleListItem[];
  pending: boolean;
  readOnly?: boolean;
  canManageRoles?: boolean;
  canChangeStatus?: boolean;
  apiFieldErrors?: Record<string, string>;
  onDismissApiFieldError?: (key: string) => void;
  onOpenChange: (open: boolean) => void;
  onCreateSubmit: (payload: z.infer<typeof provisionMemberRequestSchema>) => Promise<void>;
  onEditSubmit: (payload: {
    displayName: string;
    phone: string | null;
    roleIds: string[];
    status?: OrganizationMembershipStatus;
  }) => Promise<void>;
  onSchemaContractError?: (message: string) => void;
}) {
  const isCreate = mode === 'create';
  const effectiveReadOnly = readOnly || mode === 'view';

  const [createForm, setCreateForm] = useState<CreateFormState>(() => emptyCreateForm());
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [linkableEmployees, setLinkableEmployees] = useState<readonly EmployeeListItem[]>([]);
  const [linkableEmployeesLoading, setLinkableEmployeesLoading] = useState(false);

  const roleCatalog = grantableRoles.length > 0 ? grantableRoles : allRoles;

  const requiresEmployeeLink = useMemo(
    () => roleSelectionIsEmployeeRole(createForm.roleId, allRoles),
    [createForm.roleId, allRoles],
  );

  const loadLinkableEmployees = useCallback(async () => {
    setLinkableEmployeesLoading(true);
    try {
      const response = await listAccountLinkableEmployees();
      setLinkableEmployees(response.items);
    } catch {
      setLinkableEmployees([]);
    } finally {
      setLinkableEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !isCreate || !requiresEmployeeLink) return;
    void loadLinkableEmployees();
  }, [open, isCreate, requiresEmployeeLink, loadLinkableEmployees]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setServerErrors({});
    if (isCreate) {
      setCreateForm(emptyCreateForm());
      setShowPassword(false);
      setShowConfirmPassword(false);
      return;
    }
    if (member) {
      setEditForm(memberToEditForm(member));
    }
  }, [open, isCreate, member]);

  const createFieldSchemas = useMemo(
    () => ({
      displayName: provisionMemberRequestSchema.shape.displayName,
      email: provisionMemberRequestSchema.shape.email,
      phone: optionalLeadPhoneInputSchema,
      password: provisionMemberRequestSchema.shape.password,
      confirmPassword: z
        .string()
        .min(1, 'Confirm your password.')
        .refine((value) => value === createForm.password, { message: 'Passwords do not match.' }),
      roleIds: provisionMemberRequestSchema.shape.roleIds,
    }),
    [createForm.password],
  );

  const createLiveFields = useZodFormFields(
    createFieldSchemas,
    {
      displayName: createForm.displayName,
      email: createForm.email,
      phone: createForm.phone,
      password: createForm.password,
      confirmPassword: createForm.confirmPassword,
      roleIds: createForm.roleId ? [createForm.roleId] : [],
    },
    { disabled: pending || effectiveReadOnly },
  );

  const dismissFieldError = (key: string) => {
    clearFormFieldError(setServerErrors, key);
    onDismissApiFieldError?.(key);
  };

  const createFieldError = (key: keyof typeof createFieldSchemas) => {
    const raw = mergeFieldErrors(createLiveFields.errors, { ...serverErrors, ...apiFieldErrors }, key);
    return raw ? humanizeOrgAccessFieldError(key, raw) : undefined;
  };

  const roleGroups = useMemo(() => roleCatalogGroups(grantableRoles), [grantableRoles]);

  const editRoleSelections = useMemo(
    () => selectionsFromRoleIds(editForm?.roleIds ?? [], roleCatalog),
    [editForm?.roleIds, roleCatalog],
  );

  const employeeGroups = useMemo(
    () => employeeCatalogGroups(linkableEmployees),
    [linkableEmployees],
  );

  const createEmployeeSelection = useMemo((): CatalogSelection[] => {
    if (!createForm.employeeId) return [];
    const employee = linkableEmployees.find((item) => item.id === createForm.employeeId);
    if (!employee) {
      return [{ id: createForm.employeeId, label: createForm.employeeId, category: 'Employee' }];
    }
    return [
      {
        id: employee.id,
        label: employee.displayName,
        category: `${employee.employeeCode}${employee.workEmail ? ` · ${employee.workEmail}` : ''}`,
      },
    ];
  }, [createForm.employeeId, linkableEmployees]);

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerErrors({});
    createLiveFields.prepareSubmit();

    if (!createForm.roleId) {
      setServerErrors({ roleIds: 'Select a role.' });
      focusFirstInvalidField();
      return;
    }

    if (requiresEmployeeLink && !createForm.employeeId.trim()) {
      setServerErrors({ employeeId: 'Select an employee.' });
      focusFirstInvalidField();
      return;
    }

    const parsed = safeParseProvisionMemberRequest({
      email: createForm.email,
      displayName: createForm.displayName,
      phone: createForm.phone.trim() ? createForm.phone : null,
      password: createForm.password,
      roleIds: [createForm.roleId],
      ...(requiresEmployeeLink && createForm.employeeId
        ? { employeeId: createForm.employeeId }
        : {}),
    });
    if (!parsed.success) {
      if (orgAccessZodHasSchemaContractError(parsed.error)) {
        onSchemaContractError?.(ORG_ACCESS_CREATE_ACCOUNT_GENERIC_ERROR);
      }
      setServerErrors(mapOrgAccessZodFieldErrors(parsed.error));
      focusFirstInvalidField();
      return;
    }
    if (createForm.confirmPassword !== createForm.password) {
      setServerErrors({ confirmPassword: 'Passwords do not match.' });
      focusFirstInvalidField();
      return;
    }
    try {
      await onCreateSubmit(parsed.data);
      onOpenChange(false);
    } catch {
      focusFirstInvalidField();
    }
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editForm || !member || effectiveReadOnly) return;
    setServerErrors({});
    const phoneTrimmed = editForm.phone.trim();
    const profileParsed = updateMemberRequestSchema.safeParse({
      displayName: editForm.displayName.trim(),
      phone: phoneTrimmed ? phoneTrimmed : null,
    });
    if (!profileParsed.success) {
      setServerErrors(zodErrorToFieldMap(profileParsed.error));
      focusFirstInvalidField();
      return;
    }
    if (canManageRoles && editForm.roleIds.length === 0) {
      setServerErrors({ roleIds: 'Select at least one role.' });
      focusFirstInvalidField();
      return;
    }
    try {
      await onEditSubmit({
        displayName: profileParsed.data.displayName ?? editForm.displayName.trim(),
        phone: profileParsed.data.phone ?? null,
        roleIds: [...editForm.roleIds],
        status: canChangeStatus ? editForm.status : undefined,
      });
      onOpenChange(false);
    } catch {
      focusFirstInvalidField();
    }
  };

  const title = isCreate ? 'Create account' : effectiveReadOnly ? 'Member details' : 'Edit account';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL_CLASS}>
        <DialogHeader className="shrink-0 space-y-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-foreground pr-10 text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
        </DialogHeader>

        {isCreate ? (
          <form
            id={CREATE_FORM_ID}
            noValidate
            className="min-h-0 flex-1 overflow-y-auto px-6 py-2"
            onSubmit={(event) => void submitCreate(event)}
          >
            <div className="grid gap-6">
              <div className="grid gap-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Account information
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <CrmFieldLabel htmlFor="member-create-name" required>
                      Full name
                    </CrmFieldLabel>
                    <Input
                      id="member-create-name"
                      autoComplete="name"
                      disabled={pending}
                      value={createForm.displayName}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(createLiveFields.controlState('displayName')),
                      )}
                      onChange={(event) => {
                        setCreateForm((c) => ({ ...c, displayName: event.target.value }));
                        dismissFieldError('displayName');
                      }}
                    />
                    <CrmInlineFieldError message={createFieldError('displayName')} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-create-email" required>
                      Email address
                    </CrmFieldLabel>
                    <Input
                      id="member-create-email"
                      type="email"
                      autoComplete="email"
                      disabled={pending}
                      value={createForm.email}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(createLiveFields.controlState('email')),
                      )}
                      onChange={(event) => {
                        setCreateForm((c) => ({ ...c, email: event.target.value }));
                        dismissFieldError('email');
                      }}
                    />
                    <CrmInlineFieldError message={createFieldError('email')} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-create-phone" optional>
                      Phone number
                    </CrmFieldLabel>
                    <Input
                      id="member-create-phone"
                      type="tel"
                      disabled={pending}
                      value={createForm.phone}
                      placeholder="Optional"
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(createLiveFields.controlState('phone')),
                      )}
                      onChange={(event) => {
                        setCreateForm((c) => ({ ...c, phone: event.target.value }));
                        dismissFieldError('phone');
                      }}
                    />
                    <CrmInlineFieldError message={createFieldError('phone')} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-create-password" required>
                      Password
                    </CrmFieldLabel>
                    <div className="relative">
                      <Input
                        id="member-create-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={pending}
                        value={createForm.password}
                        className={cn(
                          CRM_PIPELINE_FORM_FIELD_CLASS,
                          'pr-11',
                          formControlStateClass(createLiveFields.controlState('password')),
                        )}
                        onChange={(event) => {
                          setCreateForm((c) => ({ ...c, password: event.target.value }));
                          dismissFieldError('password');
                        }}
                      />
                      <PasswordToggle
                        pressed={showPassword}
                        onToggle={() => setShowPassword((v) => !v)}
                        disabled={pending}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">{PASSWORD_REQUIREMENTS}</p>
                    <CrmInlineFieldError message={createFieldError('password')} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-create-confirm" required>
                      Confirm password
                    </CrmFieldLabel>
                    <div className="relative">
                      <Input
                        id="member-create-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        disabled={pending}
                        value={createForm.confirmPassword}
                        className={cn(
                          CRM_PIPELINE_FORM_FIELD_CLASS,
                          'pr-11',
                          formControlStateClass(createLiveFields.controlState('confirmPassword')),
                        )}
                        onChange={(event) => {
                          setCreateForm((c) => ({ ...c, confirmPassword: event.target.value }));
                          dismissFieldError('confirmPassword');
                        }}
                      />
                      <PasswordToggle
                        pressed={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((v) => !v)}
                        disabled={pending}
                      />
                    </div>
                    <CrmInlineFieldError message={createFieldError('confirmPassword')} reserveSpace={false} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Organization access
                </p>
                <div className="grid gap-2 sm:max-w-md">
                  <CrmFieldLabel htmlFor="member-create-role" required>
                    Assigned role
                  </CrmFieldLabel>
                  {grantableRoles.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No assignable roles are available.
                    </p>
                  ) : (
                    <Select
                      value={createForm.roleId || undefined}
                      disabled={pending}
                      onValueChange={(roleId) => {
                        const stillEmployee = roleSelectionIsEmployeeRole(roleId, allRoles);
                        setCreateForm((c) => ({
                          ...c,
                          roleId,
                          employeeId: stillEmployee ? c.employeeId : '',
                        }));
                        dismissFieldError('roleIds');
                        if (!stillEmployee) dismissFieldError('employeeId');
                        createLiveFields.touch('roleIds');
                      }}
                    >
                      <SelectTrigger
                        id="member-create-role"
                        className={cn(
                          CRM_PIPELINE_FORM_FIELD_CLASS,
                          formControlStateClass(createLiveFields.controlState('roleIds')),
                        )}
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {grantableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <CrmInlineFieldError message={createFieldError('roleIds')} reserveSpace={false} />
                </div>

                {requiresEmployeeLink ? (
                  <>
                    <SearchableMultiSelect
                      label="Select employee"
                      searchable
                      groups={employeeGroups}
                      value={createEmployeeSelection}
                      triggerPlaceholder={
                        linkableEmployeesLoading
                          ? 'Loading employees…'
                          : 'Search and select an employee…'
                      }
                      placeholder="Search by name, code, or email…"
                      emptyLabel={
                        linkableEmployeesLoading
                          ? 'Loading…'
                          : 'No eligible employees without a sign-in account.'
                      }
                      disabled={pending || linkableEmployeesLoading}
                      controlState={
                        serverErrors.employeeId || apiFieldErrors.employeeId ? 'invalid' : 'neutral'
                      }
                      onChange={(next) => {
                        const picked = next.length > 0 ? next[next.length - 1]! : null;
                        setCreateForm((c) => ({
                          ...c,
                          employeeId: picked?.id ?? '',
                        }));
                        dismissFieldError('employeeId');
                      }}
                    />
                    <CrmInlineFieldError
                      message={
                        serverErrors.employeeId ||
                        apiFieldErrors.employeeId ||
                        undefined
                      }
                      reserveSpace={false}
                    />
                  </>
                ) : null}

                <p className="text-muted-foreground text-xs leading-snug">
                  Active roles you are allowed to assign are listed. Assign the Employee role to link an
                  existing employee profile. Other roles create a standalone member account.
                </p>
              </div>
            </div>
          </form>
        ) : editForm && member ? (
          <form
            id={EDIT_FORM_ID}
            noValidate
            className="min-h-0 flex-1 overflow-y-auto px-6 py-2"
            onSubmit={(event) => void submitEdit(event)}
          >
            <div className="grid gap-6">
              {effectiveReadOnly ? (
                <dl className="grid gap-3 rounded-lg border border-border/60 px-4 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">Email</dt>
                    <dd className="mt-0.5 break-all">{member.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">Status</dt>
                    <dd className="mt-0.5">{labelMembershipStatus(member.status)}</dd>
                  </div>
                  {member.employeeDisplayName ? (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wide">Employee</dt>
                      <dd className="mt-0.5">{member.employeeDisplayName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">Joined</dt>
                    <dd className="mt-0.5">{formatDateTime(member.joinedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">Last login</dt>
                    <dd className="mt-0.5">
                      {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="grid gap-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Account information
                </p>
                <div className="grid gap-2">
                  <CrmFieldLabel htmlFor="member-edit-email">Email address</CrmFieldLabel>
                  <Input
                    id="member-edit-email"
                    readOnly
                    value={member.email}
                    className={cn(CRM_PIPELINE_FORM_FIELD_CLASS, 'bg-muted/40')}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-edit-name" required={!effectiveReadOnly}>
                      Full name
                    </CrmFieldLabel>
                    <Input
                      id="member-edit-name"
                      readOnly={effectiveReadOnly}
                      disabled={pending}
                      value={editForm.displayName}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(serverErrors.displayName ? 'invalid' : 'neutral'),
                      )}
                      onChange={(event) => {
                        setEditForm((c) => (c ? { ...c, displayName: event.target.value } : c));
                        dismissFieldError('displayName');
                      }}
                    />
                    <CrmInlineFieldError message={serverErrors.displayName} reserveSpace={false} />
                  </div>
                  <div className="grid gap-2">
                    <CrmFieldLabel htmlFor="member-edit-phone" optional>
                      Phone number
                    </CrmFieldLabel>
                    <Input
                      id="member-edit-phone"
                      type="tel"
                      readOnly={effectiveReadOnly}
                      disabled={pending}
                      value={editForm.phone}
                      className={cn(
                        CRM_PIPELINE_FORM_FIELD_CLASS,
                        formControlStateClass(serverErrors.phone ? 'invalid' : 'neutral'),
                      )}
                      onChange={(event) => {
                        setEditForm((c) => (c ? { ...c, phone: event.target.value } : c));
                        dismissFieldError('phone');
                      }}
                    />
                    <CrmInlineFieldError message={serverErrors.phone} reserveSpace={false} />
                  </div>
                </div>
              </div>

              {canManageRoles || effectiveReadOnly ? (
                <div className="grid gap-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Organization access
                  </p>
                  <SearchableMultiSelect
                    label="Assigned roles"
                    searchable
                    groups={roleGroups}
                    value={editRoleSelections}
                    triggerPlaceholder="Search and select roles…"
                    placeholder="Search roles…"
                    emptyLabel="No assignable roles are available."
                    disabled={pending || effectiveReadOnly || !canManageRoles}
                    controlState={serverErrors.roleIds ? 'invalid' : 'neutral'}
                    onChange={(next) => {
                      setEditForm((c) => (c ? { ...c, roleIds: next.map((item) => item.id) } : c));
                      dismissFieldError('roleIds');
                    }}
                  />
                  <CrmInlineFieldError message={serverErrors.roleIds} reserveSpace={false} />
                </div>
              ) : null}

              {canChangeStatus && !effectiveReadOnly && !member.isOwner ? (
                <div className="grid gap-2 sm:max-w-xs">
                  <CrmFieldLabel htmlFor="member-edit-status">Membership status</CrmFieldLabel>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) =>
                      setEditForm((c) =>
                        c ? { ...c, status: value as OrganizationMembershipStatus } : c,
                      )
                    }
                    disabled={pending}
                  >
                    <SelectTrigger id="member-edit-status" className={CRM_PIPELINE_FORM_FIELD_CLASS}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBERSHIP_STATUSES.filter((s) => s === 'ACTIVE' || s === 'SUSPENDED').map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            {labelMembershipStatus(status)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </form>
        ) : null}

        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={FORM_SECONDARY_BTN}
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {effectiveReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!effectiveReadOnly ? (
            <Button
              type="submit"
              form={isCreate ? CREATE_FORM_ID : EDIT_FORM_ID}
              className={cn('h-11 px-5', FORM_PRIMARY_BTN)}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {isCreate ? 'Creating…' : 'Saving…'}
                </>
              ) : isCreate ? (
                'Create account'
              ) : (
                'Save changes'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
