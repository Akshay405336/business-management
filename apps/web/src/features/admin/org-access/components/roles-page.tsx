'use client';

import { PERMISSION_DEFINITIONS, type PermissionKey } from '@techwin/contracts';
import {
  createRoleRequestSchema,
  setRolePermissionsRequestSchema,
  updateRoleRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
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
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  CrmErrorAlert,
  CrmFormField,
  formGridClass,
  formGridFullWidthClass,
} from '@/features/admin/crm/components/crm-feedback';
import {
  CRM_HEADER_SEARCH_FORM_CLASS,
  CrmToolbarHeader,
} from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import {
  createOrgRole,
  deleteOrgRole,
  listOrgRoles,
  setOrgRolePermissions,
  updateOrgRole,
} from '../api/org-access';
import { DEFAULT_ORG_ROLE_PAGE_SIZE, ROLE_SEARCH_DEBOUNCE_MS } from '../constants';
import { useMyPermissions } from '../hooks/use-my-permissions';
import type { OrganizationRoleStatus, OrgRoleListItem } from '../types';
import { applyOrgAccessFieldErrors, describeOrgAccessError } from '../utils/errors';
import { labelRoleStatus } from '../utils/labels';
import { slugifyRoleKey } from '../utils/role-key-slug';
import { RolePermissionMatrix } from './role-permission-matrix';

const ROLES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'text' },
  { variant: 'actions', headClassName: 'w-[5rem] text-right' },
];

type RoleEditorMode = 'create' | 'edit' | 'view';
type RoleTypeFilter = 'ALL' | 'SYSTEM' | 'CUSTOM';
type RoleStatusFilter = 'ALL' | OrganizationRoleStatus;

function RoleTypeBadge({ isSystem }: { isSystem: boolean }) {
  return (
    <Badge variant={isSystem ? 'secondary' : 'outline'}>{isSystem ? 'System' : 'Custom'}</Badge>
  );
}

function RoleStatusBadge({ status }: { status: OrganizationRoleStatus }) {
  return (
    <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'} className="font-normal">
      {labelRoleStatus(status)}
    </Badge>
  );
}

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

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RoleTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<RoleStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ORG_ROLE_PAGE_SIZE);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<RoleEditorMode>('create');
  const [editingRole, setEditingRole] = useState<OrgRoleListItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<OrganizationRoleStatus>('ACTIVE');
  const [selectedPermissions, setSelectedPermissions] = useState<ReadonlySet<PermissionKey>>(
    () => new Set(),
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<OrgRoleListItem | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, ROLE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft]);

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

  const filtersActive =
    search.length > 0 || typeFilter !== 'ALL' || statusFilter !== 'ALL';

  const filteredRoles = useMemo(() => {
    let list = roles;
    if (search) {
      const query = search.toLowerCase();
      list = list.filter(
        (role) =>
          role.name.toLowerCase().includes(query) || role.key.toLowerCase().includes(query),
      );
    }
    if (typeFilter === 'SYSTEM') list = list.filter((role) => role.isSystem);
    if (typeFilter === 'CUSTOM') list = list.filter((role) => !role.isSystem);
    if (statusFilter !== 'ALL') list = list.filter((role) => role.status === statusFilter);
    return list;
  }, [roles, search, statusFilter, typeFilter]);

  const totalFiltered = filteredRoles.length;
  const totalPages = totalFiltered === 0 ? 0 : Math.ceil(totalFiltered / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const paginatedRoles = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, pageSize, safePage]);

  const tablePhase = deriveDataTablePhase({ loading, error, rowCount: paginatedRoles.length });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: roles.length });

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const resetEditor = () => {
    setFormName('');
    setFormKey('');
    setKeyManuallyEdited(false);
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

  const populateEditor = (role: OrgRoleListItem) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormKey(role.key);
    setKeyManuallyEdited(true);
    setFormDescription(role.description);
    setFormStatus(role.status);
    setSelectedPermissions(new Set(role.permissionKeys));
    setFormErrors({});
  };

  const openView = (role: OrgRoleListItem) => {
    populateEditor(role);
    setEditorMode('view');
    setEditorOpen(true);
  };

  const openEdit = (role: OrgRoleListItem) => {
    populateEditor(role);
    setEditorMode(role.isSystem ? 'view' : 'edit');
    setEditorOpen(true);
  };

  const permissionsReadOnly =
    editorMode === 'view' || (editorMode === 'edit' && (editingRole?.isSystem ?? false));

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

  const replacePermissions = (keys: readonly PermissionKey[]) => {
    if (permissionsReadOnly) return;
    setSelectedPermissions(new Set(keys));
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

    if (editorMode !== 'edit' || !editingRole) return;

    try {
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
      if (permissionKeys.length === 0) {
        setFormErrors({ permissionKeys: 'Select at least one permission.' });
        return;
      }
      await run(() => setOrgRolePermissions(editingRole.id, permissionsParsed.data));

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

  const editorTitle =
    editorMode === 'create'
      ? 'Create role'
      : editorMode === 'view'
        ? `View role — ${editingRole?.name ?? ''}`
        : `Edit role — ${editingRole?.name ?? ''}`;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Home', href: '/admin/dashboard' },
          { label: 'Administration', href: '/admin/users' },
          { label: 'Roles & Permissions' },
        ]}
      />

      {!canRead ? (
        <CrmErrorAlert message="You do not have permission to view roles." />
      ) : (
        <section aria-label="Roles and permissions" className="flex min-w-0 flex-col gap-4">
          <CrmToolbarHeader
            className="shadow-xs min-w-0"
            layout="stacked"
            title="Roles & Permissions"
            description="Manage roles and control access across Techwin."
            toolbar={
              <>
                <form
                  className={CRM_HEADER_SEARCH_FORM_CLASS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearch(searchDraft.trim());
                    setPage(1);
                  }}
                >
                  <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 w-full">
                    <Input
                      className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Search by name or key"
                      aria-label="Search roles"
                    />
                  </InputGroup>
                </form>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as RoleTypeFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-[9rem] sm:w-[9rem]" aria-label="Filter by type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All types</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as RoleStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full min-w-[9rem] sm:w-[9rem]" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {filtersActive ? (
                  <Button type="button" variant="ghost" className="h-9 shrink-0" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
                {canCreate ? (
                  <Button type="button" className="h-9 shrink-0" onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    Create Role
                  </Button>
                ) : null}
              </>
            }
          />

          <p className="text-muted-foreground px-0.5 text-sm tabular-nums" aria-live="polite">
            {loading && roles.length === 0
              ? 'Loading roles…'
              : `${totalFiltered} role${totalFiltered === 1 ? '' : 's'}${filtersActive ? ' matching filters' : ''}`}
          </p>

          {error && roles.length > 0 ? <CrmErrorAlert message={error} /> : null}

          <DataTable
            className="min-w-0 max-w-full"
            tableClassName="table-fixed"
            phase={tablePhase}
            colSpan={8}
            skeletonColumns={ROLES_TABLE_SKELETON}
            header={
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[16%]">Role Name</TableHead>
                <TableHead className="w-[14%]">Role Key</TableHead>
                <TableHead className="w-[10%]">Type</TableHead>
                <TableHead className="w-[10%]">Permissions</TableHead>
                <TableHead className="w-[10%] text-right">Members</TableHead>
                <TableHead className="w-[10%]">Status</TableHead>
                <TableHead className="w-[14%]">Created At</TableHead>
                <TableHead className="w-[16%] text-right">Actions</TableHead>
              </TableRow>
            }
            empty={{
              icon: Shield,
              title: filtersActive ? 'No roles match your filters' : 'No roles yet',
              description: filtersActive
                ? 'Try different search terms or clear filters.'
                : canCreate
                  ? 'Create a custom role to tailor permissions for your team.'
                  : 'Roles will appear here when they are configured.',
              secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
            }}
            errorMessage={error}
            onRetry={() => void load()}
            refreshing={tableRefreshing}
          >
            {paginatedRoles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  <span className="block truncate" title={role.name}>
                    {role.name}
                  </span>
                </TableCell>
                <TableCell>
                  <code className="text-muted-foreground block truncate text-xs" title={role.key}>
                    {role.key}
                  </code>
                </TableCell>
                <TableCell>
                  <RoleTypeBadge isSystem={role.isSystem} />
                </TableCell>
                <TableCell className="tabular-nums">{role.permissionKeys.length}</TableCell>
                <TableCell className="text-right tabular-nums">{role.memberCount}</TableCell>
                <TableCell>
                  <RoleStatusBadge status={role.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDateTime(role.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TableIconButton label={`Actions for ${role.name}`} disabled={pending}>
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </TableIconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                      <DropdownMenuItem onSelect={() => openView(role)}>
                        <Eye className="size-4" aria-hidden="true" />
                        View
                      </DropdownMenuItem>
                      {!role.isSystem && canUpdate ? (
                        <DropdownMenuItem onSelect={() => openEdit(role)}>
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                      ) : role.isSystem ? (
                        <DropdownMenuItem disabled title="System roles are read-only.">
                          <Pencil className="size-4 opacity-50" aria-hidden="true" />
                          Edit (system)
                        </DropdownMenuItem>
                      ) : null}
                      {!role.isSystem && canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={role.memberCount > 0}
                            title={
                              role.memberCount > 0
                                ? 'Remove this role from all members before deleting.'
                                : undefined
                            }
                            onSelect={() => setDeleteTarget(role)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>

          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={totalFiltered}
            loading={loading && roles.length === 0}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </section>
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
            <DialogTitle>{editorTitle}</DialogTitle>
            <DialogDescription>
              {permissionsReadOnly
                ? 'System roles and their permissions are managed by the platform and cannot be changed here.'
                : 'Set role details and choose permissions by module.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            {editorMode === 'view' && editingRole ? (
              <dl className="mb-4 grid gap-2 rounded-lg border px-4 py-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Type</dt>
                  <dd className="mt-0.5">
                    <RoleTypeBadge isSystem={editingRole.isSystem} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Status</dt>
                  <dd className="mt-0.5">
                    <RoleStatusBadge status={editingRole.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Members</dt>
                  <dd className="mt-0.5 tabular-nums">{editingRole.memberCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Permissions</dt>
                  <dd className="mt-0.5 tabular-nums">{editingRole.permissionKeys.length}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Created</dt>
                  <dd className="mt-0.5">{formatDateTime(editingRole.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wide">Last updated</dt>
                  <dd className="mt-0.5">{formatDateTime(editingRole.updatedAt)}</dd>
                </div>
              </dl>
            ) : null}
            <div className={formGridClass}>
              <CrmFormField id="role-name" label="Role Name" required error={formErrors.name}>
                <Input
                  id="role-name"
                  value={formName}
                  readOnly={permissionsReadOnly}
                  className={formControlStateClass(formErrors.name ? 'invalid' : 'neutral')}
                  onChange={(event) => {
                    clearFormFieldError(setFormErrors, 'name');
                    const next = event.target.value;
                    setFormName(next);
                    if (editorMode === 'create' && !keyManuallyEdited) {
                      setFormKey(slugifyRoleKey(next));
                    }
                  }}
                />
              </CrmFormField>
              <CrmFormField id="role-key" label="Role Key" required error={formErrors.key}>
                <Input
                  id="role-key"
                  value={formKey}
                  readOnly={editorMode !== 'create'}
                  disabled={editorMode !== 'create'}
                  className={formControlStateClass(formErrors.key ? 'invalid' : 'neutral')}
                  onChange={(event) => {
                    clearFormFieldError(setFormErrors, 'key');
                    setKeyManuallyEdited(true);
                    setFormKey(event.target.value);
                  }}
                  placeholder="e.g. sales_manager"
                />
              </CrmFormField>
              {editorMode === 'edit' && !editingRole?.isSystem ? (
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
                  <RolePermissionMatrix
                    catalog={permissionCatalog}
                    selected={selectedPermissions}
                    readOnly={permissionsReadOnly || (editorMode === 'edit' && !canUpdate)}
                    onToggle={togglePermission}
                    onReplaceSelection={replacePermissions}
                  />
                </CrmFormField>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={pending}>
              {editorMode === 'view' || permissionsReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {editorMode === 'edit' && canUpdate && !editingRole?.isSystem ? (
              <Button type="button" onClick={() => void saveRole()} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            ) : null}
            {editorMode === 'create' && canCreate ? (
              <Button type="button" onClick={() => void saveRole()} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  'Create role'
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
              {deleteTarget && deleteTarget.memberCount > 0
                ? `${deleteTarget.name} is assigned to ${deleteTarget.memberCount} member(s). Remove the role from all members before deleting it.`
                : `This permanently removes ${deleteTarget?.name ?? 'this role'}. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || (deleteTarget?.memberCount ?? 0) > 0}
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
