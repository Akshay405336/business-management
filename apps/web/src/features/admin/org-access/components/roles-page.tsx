'use client';

import {
  PERMISSION_DEFINITIONS,
  type PermissionDefinition,
  type PermissionKey,
} from '@techwin/contracts';
import {
  createRoleRequestSchema,
  setRolePermissionsRequestSchema,
  updateRoleRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import type { DataTableSkeletonColumn } from '@/features/admin/components/data-table-skeleton';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CrmErrorAlert,
  CrmFormField,
  formGridClass,
  formGridFullWidthClass,
} from '@/features/admin/crm/components/crm-feedback';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import {
  createOrgRole,
  deleteOrgRole,
  listOrgRoles,
  setOrgRolePermissions,
  updateOrgRole,
} from '../api/org-access';
import { useMyPermissions } from '../hooks/use-my-permissions';
import type { OrganizationRoleStatus, OrgRoleListItem } from '../types';
import { applyOrgAccessFieldErrors, describeOrgAccessError } from '../utils/errors';
import { labelRoleStatus } from '../utils/labels';

const ROLES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'actions', headClassName: 'w-[5rem] text-right' },
];

function groupPermissionsByModule(
  catalog: readonly PermissionDefinition[],
): ReadonlyMap<string, readonly PermissionDefinition[]> {
  const map = new Map<string, PermissionDefinition[]>();
  for (const item of catalog) {
    const list = map.get(item.module) ?? [];
    list.push(item);
    map.set(item.module, list);
  }
  return map;
}

function PermissionMatrix({
  catalog,
  selected,
  readOnly,
  onToggle,
}: {
  catalog: readonly PermissionDefinition[];
  selected: ReadonlySet<PermissionKey>;
  readOnly: boolean;
  onToggle: (key: PermissionKey, checked: boolean) => void;
}) {
  const grouped = useMemo(() => groupPermissionsByModule(catalog), [catalog]);
  const modules = useMemo(() => [...grouped.keys()].sort((a, b) => a.localeCompare(b)), [grouped]);

  return (
    <div className="grid gap-4">
      {modules.map((moduleName) => (
        <div key={moduleName} className="rounded-lg border">
          <div className="bg-muted/40 border-b px-3 py-2 text-sm font-medium">{moduleName}</div>
          <ul className="divide-y">
            {(grouped.get(moduleName) ?? []).map((item) => (
              <li key={item.key}>
                <label
                  className={
                    readOnly
                      ? 'flex items-start gap-3 px-3 py-2.5 opacity-80'
                      : 'hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-3 py-2.5'
                  }
                >
                  <Checkbox
                    checked={selected.has(item.key)}
                    disabled={readOnly}
                    onCheckedChange={(value) => onToggle(item.key, value === true)}
                    aria-label={`${item.action}: ${item.description}`}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{item.action}</span>
                    <span className="text-muted-foreground text-xs">{item.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type RoleEditorMode = 'create' | 'edit';

export function RolesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();
  const { has } = useMyPermissions();

  const canRead = has('roles.read');
  const canCreate = has('roles.create');
  const canUpdate = has('roles.update');
  const canDelete = has('roles.delete');

  const permissionCatalog = PERMISSION_DEFINITIONS;

  const [roles, setRoles] = useState<readonly OrgRoleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<RoleEditorMode>('create');
  const [editingRole, setEditingRole] = useState<OrgRoleListItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<OrganizationRoleStatus>('ACTIVE');
  const [selectedPermissions, setSelectedPermissions] = useState<ReadonlySet<PermissionKey>>(
    () => new Set(),
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<OrgRoleListItem | null>(null);

  const load = useCallback(async () => {
    if (!canRead) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rolesResponse = await listOrgRoles();
      setRoles(rolesResponse.items);
    } catch (failure) {
      setError(describeOrgAccessError(failure));
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    void load();
  }, [load]);

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: roles.length });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: roles.length });

  const resetEditor = () => {
    setFormName('');
    setFormKey('');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setSelectedPermissions(new Set());
    setFormErrors({});
    setEditingRole(null);
  };

  const openCreate = () => {
    resetEditor();
    setEditorMode('create');
    setEditorOpen(true);
  };

  const openEdit = (role: OrgRoleListItem) => {
    setEditorMode('edit');
    setEditingRole(role);
    setFormName(role.name);
    setFormKey(role.key);
    setFormDescription(role.description);
    setFormStatus(role.status);
    setSelectedPermissions(new Set(role.permissionKeys));
    setFormErrors({});
    setEditorOpen(true);
  };

  const permissionsReadOnly = editorMode === 'edit' && (editingRole?.isSystem ?? false);

  const togglePermission = (key: PermissionKey, checked: boolean) => {
    if (permissionsReadOnly) return;
    setSelectedPermissions((previous) => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
    clearFormFieldError(setFormErrors, 'permissionKeys');
  };

  const saveRole = async () => {
    setFormErrors({});
    const permissionKeys = [...selectedPermissions];

    if (editorMode === 'create') {
      const parsed = createRoleRequestSchema.safeParse({
        name: formName.trim(),
        key: formKey.trim(),
        description: formDescription.trim() || undefined,
        permissionKeys,
      });
      if (!parsed.success) {
        setFormErrors(zodErrorToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await run(() => createOrgRole(parsed.data));
        toast.success('Role created.');
        setEditorOpen(false);
        resetEditor();
        await load();
      } catch (failure) {
        if (!applyOrgAccessFieldErrors(failure, setFormErrors)) {
          toast.error(describeOrgAccessError(failure));
        }
      }
      return;
    }

    if (!editingRole) return;

    try {
      if (!editingRole.isSystem && canUpdate) {
        const metadataParsed = updateRoleRequestSchema.safeParse({
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
        });
        if (!metadataParsed.success) {
          setFormErrors(zodErrorToFieldMap(metadataParsed.error));
          focusFirstInvalidField();
          return;
        }
        await run(() => updateOrgRole(editingRole.id, metadataParsed.data));

        const permissionsParsed = setRolePermissionsRequestSchema.safeParse({ permissionKeys });
        if (!permissionsParsed.success) {
          setFormErrors(zodErrorToFieldMap(permissionsParsed.error));
          return;
        }
        await run(() => setOrgRolePermissions(editingRole.id, permissionsParsed.data));
      }

      toast.success('Role saved.');
      setEditorOpen(false);
      resetEditor();
      await load();
    } catch (failure) {
      if (!applyOrgAccessFieldErrors(failure, setFormErrors)) {
        toast.error(describeOrgAccessError(failure));
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await run(() => deleteOrgRole(deleteTarget.id));
      toast.success('Role deleted.');
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeOrgAccessError(failure));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Roles & Permissions' }]} className="mb-0.5" />

      {!canRead ? (
        <CrmErrorAlert message="You do not have permission to view roles." />
      ) : (
        <>
          <CrmToolbarHeader
            className="shadow-xs"
            title="Roles & permissions"
            description="Define custom roles and control what members can access."
            toolbar={
              canCreate ? (
                <Button type="button" className="h-11 shrink-0" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Create role
                </Button>
              ) : null
            }
          />

          {error && roles.length > 0 ? <CrmErrorAlert message={error} /> : null}

          <DataTable
            className="min-w-0 max-w-full"
            phase={tablePhase}
            colSpan={6}
            skeletonColumns={ROLES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            }
            empty={{
              icon: Shield,
              title: 'No roles yet',
              description: canCreate
                ? 'Create a custom role to tailor permissions for your team.'
                : 'Roles will appear here when they are configured.',
            }}
            errorMessage={error}
            onRetry={() => void load()}
            refreshing={tableRefreshing}
          >
            {roles.map((role) => (
              <TableRow key={role.id} className="cursor-pointer" onClick={() => openEdit(role)}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{role.key}</TableCell>
                <TableCell>
                  <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </Badge>
                </TableCell>
                <TableCell>{labelRoleStatus(role.status)}</TableCell>
                <TableCell className="text-right tabular-nums">{role.memberCount}</TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  {!role.isSystem && canDelete ? (
                    <TableIconButton
                      label={`Delete ${role.name}`}
                      tone="danger"
                      disabled={pending}
                      onClick={() => setDeleteTarget(role)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </TableIconButton>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </>
      )}

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditorOpen(false);
            resetEditor();
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-none w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(720px,calc(100vw-64px))] sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <DialogTitle>
              {editorMode === 'create'
                ? 'Create role'
                : editingRole?.isSystem
                  ? `View system role — ${editingRole.name}`
                  : `Edit role — ${editingRole?.name ?? ''}`}
            </DialogTitle>
            <DialogDescription>
              {permissionsReadOnly
                ? 'System role permissions are read-only.'
                : 'Set role details and choose permissions by module.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            <div className={formGridClass}>
              <CrmFormField id="role-name" label="Name" required error={formErrors.name}>
                <Input
                  id="role-name"
                  value={formName}
                  readOnly={permissionsReadOnly}
                  className={formControlStateClass(formErrors.name ? 'invalid' : 'neutral')}
                  onChange={(event) => {
                    clearFormFieldError(setFormErrors, 'name');
                    setFormName(event.target.value);
                  }}
                />
              </CrmFormField>
              <CrmFormField id="role-key" label="Key" required error={formErrors.key}>
                <Input
                  id="role-key"
                  value={formKey}
                  readOnly={editorMode === 'edit'}
                  disabled={editorMode === 'edit'}
                  className={formControlStateClass(formErrors.key ? 'invalid' : 'neutral')}
                  onChange={(event) => {
                    clearFormFieldError(setFormErrors, 'key');
                    setFormKey(event.target.value);
                  }}
                  placeholder="e.g. sales_manager"
                />
              </CrmFormField>
              {!editingRole?.isSystem && editorMode === 'edit' ? (
                <CrmFormField id="role-status" label="Status">
                  <Select
                    value={formStatus}
                    onValueChange={(value) => setFormStatus(value as OrganizationRoleStatus)}
                  >
                    <SelectTrigger id="role-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </CrmFormField>
              ) : null}
              <div className={formGridFullWidthClass}>
                <CrmFormField id="role-description" label="Description" optional error={formErrors.description}>
                  <Textarea
                    id="role-description"
                    rows={2}
                    readOnly={permissionsReadOnly}
                    value={formDescription}
                    onChange={(event) => {
                      clearFormFieldError(setFormErrors, 'description');
                      setFormDescription(event.target.value);
                    }}
                  />
                </CrmFormField>
              </div>
              <div className={formGridFullWidthClass}>
                <CrmFormField label="Permissions" error={formErrors.permissionKeys}>
                  <PermissionMatrix
                    catalog={permissionCatalog}
                    selected={selectedPermissions}
                    readOnly={permissionsReadOnly || (editorMode === 'edit' && !canUpdate)}
                    onToggle={togglePermission}
                  />
                </CrmFormField>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={pending}>
              {permissionsReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!permissionsReadOnly && (editorMode === 'create' ? canCreate : canUpdate) ? (
              <Button type="button" onClick={() => void saveRole()} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : editorMode === 'create' ? (
                  'Create role'
                ) : (
                  'Save changes'
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.name ?? 'this role'}. Members must be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
