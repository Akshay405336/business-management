'use client';

import {
  createEmployeeRequestSchema,
  employeeListQuerySchema,
  leadEmailSchema,
  leadPhoneSchema,
  updateEmployeeRequestSchema,
} from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { Eye, Loader2, Pencil, Plus, Power, Search, Trash2, Users } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { cn } from '@/shared/lib/utils';
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
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import {
  changeEmployeeStatus,
  createEmployee,
  deleteEmployee,
  listEmployeeManagerOptions,
  getEmployee,
  listEmployees,
  previewEmployeeCode,
  updateEmployee,
} from '../api/employees';
import { DEFAULT_EMPLOYEE_PAGE_SIZE, EMPLOYEE_EMPLOYMENT_TYPES, EMPLOYEE_STATUSES } from '../constants';
import type {
  EmployeeDetail,
  EmployeeEmploymentStatus,
  EmployeeEmploymentType,
  EmployeeListItem,
  EmployeeListQuery,
  EmployeeManagerSummary,
} from '../types';
import { applyEmployeeFieldErrors, describeEmployeeError } from '../utils/errors';
import { labelEmploymentType, labelEmployeeStatus } from '../utils/labels';
import { EmployeeDetailDialog } from './employee-detail-dialog';
import { EmployeeStatusBadge } from './employee-status-badge';

const SEARCH_DEBOUNCE_MS = 400;

const EMPLOYEES_TABLE_SKELETON: readonly DataTableSkeletonColumn[] = [
  { variant: 'textWide' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'text' },
  { variant: 'badge' },
  { variant: 'actions', headClassName: 'w-[8.5rem] text-right' },
];

type EmployeeForm = {
  firstName: string;
  lastName: string;
  workEmail: string;
  phone: string;
  alternatePhone: string;
  employeeCode: string;
  jobTitle: string;
  department: string;
  employmentType: EmployeeEmploymentType;
  employmentStatus: EmployeeEmploymentStatus;
  dateOfJoining: string;
  reportingManagerId: string;
  workLocation: string;
  probationEndDate: string;
  employmentEndDate: string;
  notes: string;
};

const emptyForm = (): EmployeeForm => ({
  firstName: '',
  lastName: '',
  workEmail: '',
  phone: '',
  alternatePhone: '',
  employeeCode: '',
  jobTitle: '',
  department: '',
  employmentType: 'FULL_TIME',
  employmentStatus: 'ACTIVE',
  dateOfJoining: '',
  reportingManagerId: '',
  workLocation: '',
  probationEndDate: '',
  employmentEndDate: '',
  notes: '',
});

const formFromDetail = (detail: EmployeeDetail): EmployeeForm => ({
  firstName: detail.firstName,
  lastName: detail.lastName,
  workEmail: detail.workEmail,
  phone: detail.phone,
  alternatePhone: detail.alternatePhone ?? '',
  employeeCode: detail.employeeCode,
  jobTitle: detail.jobTitle,
  department: detail.department,
  employmentType: detail.employmentType,
  employmentStatus: detail.employmentStatus,
  dateOfJoining: detail.dateOfJoining,
  reportingManagerId: detail.reportingManager?.id ?? '',
  workLocation: detail.workLocation ?? '',
  probationEndDate: detail.probationEndDate ?? '',
  employmentEndDate: detail.employmentEndDate ?? '',
  notes: detail.notes,
});

export function EmployeesPage() {
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [items, setItems] = useState<readonly EmployeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EMPLOYEE_PAGE_SIZE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EmployeeEmploymentStatus>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<'ALL' | EmployeeEmploymentType>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(() => emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [codePreviewHint, setCodePreviewHint] = useState('');
  const [managers, setManagers] = useState<readonly EmployeeManagerSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const liveFields = useZodFormFields(
    {
      firstName: createEmployeeRequestSchema.shape.firstName,
      lastName: createEmployeeRequestSchema.shape.lastName,
      workEmail: leadEmailSchema,
      phone: leadPhoneSchema,
      jobTitle: createEmployeeRequestSchema.shape.jobTitle,
      department: createEmployeeRequestSchema.shape.department,
      dateOfJoining: createEmployeeRequestSchema.shape.dateOfJoining,
    },
    {
      firstName: form.firstName,
      lastName: form.lastName,
      workEmail: form.workEmail,
      phone: form.phone,
      jobTitle: form.jobTitle,
      department: form.department,
      dateOfJoining: form.dateOfJoining.trim() === '' ? '1970-01-01' : form.dateOfJoining,
    },
  );

  const fieldError = (key: string) => mergeFieldErrors(liveFields.errors, formErrors, key);

  const query = useMemo((): EmployeeListQuery => {
    const candidate: EmployeeListQuery = {
      search: search.trim() || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      department: departmentFilter.trim() || undefined,
      employmentType: employmentTypeFilter === 'ALL' ? undefined : employmentTypeFilter,
      page,
      pageSize,
      sortBy: 'displayName',
      sortDir: 'asc',
    };
    return employeeListQuerySchema.parse(candidate);
  }, [search, statusFilter, departmentFilter, employmentTypeFilter, page, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listEmployees(query);
      setItems(response.items);
      setTotal(response.total);
    } catch (failure) {
      setError(describeEmployeeError(failure));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    void load();
  }, [load]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
  }, [statusFilter, departmentFilter, employmentTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp page when result set shrinks
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    departmentFilter.trim().length > 0 ||
    employmentTypeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setDepartmentFilter('');
    setEmploymentTypeFilter('ALL');
    setPage(1);
  };

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: total,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: items.length });

  const resetForm = () => {
    setForm(emptyForm());
    setFormErrors({});
    setCodePreviewHint('');
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (employee: EmployeeListItem) => {
    setEditingId(employee.id);
    setFormErrors({});
    setDialogOpen(true);
    void getEmployee(employee.id)
      .then((detail) => setForm(formFromDetail(detail)))
      .catch((failure) => toast.error(describeEmployeeError(failure)));
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const controller = new AbortController();
    void listEmployeeManagerOptions(editingId ?? undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setManagers(result.managers);
      })
      .catch(() => {
        if (!controller.signal.aborted) setManagers([]);
      });
    return () => controller.abort();
  }, [dialogOpen, editingId]);

  useEffect(() => {
    if (!dialogOpen || editingId) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset preview when create dialog opens
    setForm((f) => ({ ...f, employeeCode: '' }));
    setCodePreviewHint('Loading next employee code…');
    void previewEmployeeCode(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((f) => ({ ...f, employeeCode: result.employeeCode }));
        setCodePreviewHint('Preview only — the server assigns the final code when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCodePreviewHint('Could not load code preview.');
      });
    return () => controller.abort();
  }, [dialogOpen, editingId]);

  const buildPayload = () => ({
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    workEmail: form.workEmail,
    phone: form.phone,
    alternatePhone: form.alternatePhone.trim() ? form.alternatePhone : null,
    jobTitle: form.jobTitle.trim(),
    department: form.department.trim(),
    employmentType: form.employmentType,
    ...(editingId ? {} : { employmentStatus: form.employmentStatus }),
    dateOfJoining: form.dateOfJoining,
    probationEndDate: form.probationEndDate.trim() ? form.probationEndDate : null,
    employmentEndDate: form.employmentEndDate.trim() ? form.employmentEndDate : null,
    workLocation: form.workLocation.trim() || null,
    reportingManagerId: form.reportingManagerId.trim() ? form.reportingManagerId : null,
    notes: form.notes.trim() || undefined,
  });

  const save = async () => {
    setFormErrors({});
    const payload = buildPayload();
    if (editingId) {
      const parsed = updateEmployeeRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setFormErrors(zodErrorToFieldMap(parsed.error));
        focusFirstInvalidField();
        return;
      }
      try {
        await run(() => updateEmployee(editingId, parsed.data));
        toast.success('Employee updated.');
        setDialogOpen(false);
        setEditingId(null);
        resetForm();
        await load();
      } catch (failure) {
        if (!applyEmployeeFieldErrors(failure, setFormErrors)) {
          toast.error(describeEmployeeError(failure));
        }
      }
      return;
    }
    const parsed = createEmployeeRequestSchema.safeParse({
      ...payload,
      employmentStatus: form.employmentStatus,
    });
    if (!parsed.success) {
      setFormErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      await run(() => createEmployee(parsed.data));
      toast.success('Employee created.');
      setDialogOpen(false);
      resetForm();
      await load();
    } catch (failure) {
      if (!applyEmployeeFieldErrors(failure, setFormErrors)) {
        toast.error(describeEmployeeError(failure));
      }
    }
  };

  const toggleStatus = async (employee: EmployeeListItem) => {
    const next: EmployeeEmploymentStatus =
      employee.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => changeEmployeeStatus(employee.id, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Employee activated.' : 'Employee deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeEmployeeError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await run(() => deleteEmployee(deleteTarget.id));
      toast.success('Employee deleted.');
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      toast.error(describeEmployeeError(failure));
    }
  };

  const openView = (employee: EmployeeListItem) => {
    setDetailId(employee.id);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-1 pb-8">
      <AdminBreadcrumb breadcrumbs={[{ label: 'Employees' }]} className="mb-0.5" />
      <CrmToolbarHeader
        className="shadow-xs"
        title="Employees"
        description="Manage employee records, roles, and employment details."
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
                  className={cn('h-11', inputGroupPaddingClass({ leading: true }))}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search by name, code, email, or phone"
                  aria-label="Search employees"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="h-11 w-full min-w-[9rem] sm:w-[9rem]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {EMPLOYEE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelEmployeeStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-11 w-full min-w-[9rem] sm:w-[10rem]"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              placeholder="Department"
              aria-label="Filter by department"
            />
            <Select
              value={employmentTypeFilter}
              onValueChange={(value) => setEmploymentTypeFilter(value as typeof employmentTypeFilter)}
            >
              <SelectTrigger className="h-11 w-full min-w-[9rem] sm:w-[10rem]" aria-label="Filter by employment type">
                <SelectValue placeholder="Employment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {EMPLOYEE_EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {labelEmploymentType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" className="h-11 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Add Employee
            </Button>
          </>
        }
      />

      {error && items.length > 0 ? <CrmErrorAlert message={error} /> : null}

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed"
        phase={tablePhase}
        colSpan={9}
        skeletonColumns={EMPLOYEES_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[16%]">Employee</TableHead>
            <TableHead className="w-[10%]">Code</TableHead>
            <TableHead className="w-[12%]">Job title</TableHead>
            <TableHead className="w-[10%]">Department</TableHead>
            <TableHead className="w-[14%]">Work email</TableHead>
            <TableHead className="w-[10%]">Phone</TableHead>
            <TableHead className="w-[9%]">Joined</TableHead>
            <TableHead className="w-[9%]">Status</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          icon: Users,
          title: filtersActive ? 'No employees match your filters' : 'No employees yet',
          description: filtersActive
            ? 'Try different search terms or clear filters.'
            : 'Add an employee to track employment details and reporting lines.',
          secondaryAction: filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            loading={tablePhase === 'initial-loading'}
            hideWhenEmpty={false}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {items.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="min-w-0 truncate font-medium">{employee.displayName}</TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate font-mono text-xs">
              {employee.employeeCode}
            </TableCell>
            <TableCell className="min-w-0 truncate">{employee.jobTitle}</TableCell>
            <TableCell className="min-w-0 truncate">{employee.department}</TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate">{employee.workEmail}</TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate">{employee.phone}</TableCell>
            <TableCell className="text-muted-foreground truncate text-sm">{employee.dateOfJoining}</TableCell>
            <TableCell>
              <EmployeeStatusBadge status={employee.employmentStatus} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <TableIconButton
                  label={`View ${employee.displayName}`}
                  tone="default"
                  disabled={pending}
                  onClick={() => openView(employee)}
                >
                  <Eye className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Edit ${employee.displayName}`}
                  tone="primary"
                  disabled={pending}
                  onClick={() => openEdit(employee)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={
                    employee.employmentStatus === 'ACTIVE'
                      ? `Deactivate ${employee.displayName}`
                      : `Activate ${employee.displayName}`
                  }
                  tone={employee.employmentStatus === 'ACTIVE' ? 'success' : 'danger'}
                  disabled={pending}
                  onClick={() => void toggleStatus(employee)}
                >
                  <Power className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Delete ${employee.displayName}`}
                  tone="danger"
                  disabled={pending}
                  onClick={() => setDeleteTarget(employee)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <EmployeeDetailDialog employeeId={detailId} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false);
            setEditingId(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="flex max-h-[92vh] max-w-none w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(720px,calc(100vw-64px))] sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <DialogTitle>{editingId ? 'Edit employee' : 'Add employee'}</DialogTitle>
            <DialogDescription>Personal, contact, and employment details for this organization.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            <div className={formGridClass}>
              <CrmFormField id="emp-first-name" label="First name" required error={fieldError('firstName')}>
                <Input
                  id="emp-first-name"
                  value={form.firstName}
                  className={formControlStateClass(liveFields.controlState('firstName'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'firstName');
                    setForm((f) => ({ ...f, firstName: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-last-name" label="Last name" required error={fieldError('lastName')}>
                <Input
                  id="emp-last-name"
                  value={form.lastName}
                  className={formControlStateClass(liveFields.controlState('lastName'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'lastName');
                    setForm((f) => ({ ...f, lastName: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-email" label="Work email" required error={fieldError('workEmail')}>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.workEmail}
                  className={formControlStateClass(liveFields.controlState('workEmail'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'workEmail');
                    setForm((f) => ({ ...f, workEmail: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-phone" label="Phone" required error={fieldError('phone')}>
                <Input
                  id="emp-phone"
                  value={form.phone}
                  className={formControlStateClass(liveFields.controlState('phone'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'phone');
                    setForm((f) => ({ ...f, phone: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-alt-phone" label="Alternate phone" optional error={fieldError('alternatePhone')}>
                <Input
                  id="emp-alt-phone"
                  value={form.alternatePhone}
                  className={formControlStateClass(fieldError('alternatePhone') ? 'invalid' : 'neutral')}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'alternatePhone');
                    setForm((f) => ({ ...f, alternatePhone: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-code" label="Employee code">
                <Input id="emp-code" value={form.employeeCode} readOnly disabled className="font-mono" />
                {!editingId && codePreviewHint ? (
                  <p className="text-muted-foreground mt-1 text-xs">{codePreviewHint}</p>
                ) : null}
              </CrmFormField>
              <CrmFormField id="emp-job" label="Job title" required error={fieldError('jobTitle')}>
                <Input
                  id="emp-job"
                  value={form.jobTitle}
                  className={formControlStateClass(liveFields.controlState('jobTitle'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'jobTitle');
                    setForm((f) => ({ ...f, jobTitle: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-dept" label="Department" required error={fieldError('department')}>
                <Input
                  id="emp-dept"
                  value={form.department}
                  className={formControlStateClass(liveFields.controlState('department'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'department');
                    setForm((f) => ({ ...f, department: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField id="emp-type" label="Employment type" required>
                <Select
                  value={form.employmentType}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, employmentType: value as EmployeeEmploymentType }))
                  }
                >
                  <SelectTrigger id="emp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_EMPLOYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelEmploymentType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              {!editingId ? (
                <CrmFormField id="emp-status" label="Employment status">
                  <Select
                    value={form.employmentStatus}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, employmentStatus: value as EmployeeEmploymentStatus }))
                    }
                  >
                    <SelectTrigger id="emp-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_STATUSES.filter((s) => s !== 'TERMINATED').map((status) => (
                        <SelectItem key={status} value={status}>
                          {labelEmployeeStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CrmFormField>
              ) : null}
              <CrmFormField id="emp-joined" label="Date of joining" required error={fieldError('dateOfJoining')}>
                <Input
                  id="emp-joined"
                  type="date"
                  value={form.dateOfJoining}
                  className={formControlStateClass(liveFields.controlState('dateOfJoining'))}
                  onChange={(e) => {
                    clearFormFieldError(setFormErrors, 'dateOfJoining');
                    setForm((f) => ({ ...f, dateOfJoining: e.target.value }));
                  }}
                />
              </CrmFormField>
              <CrmFormField
                id="emp-manager"
                label="Reporting manager"
                optional
                error={fieldError('reportingManagerId')}
              >
                <Select
                  value={form.reportingManagerId || '__none__'}
                  onValueChange={(value) => {
                    clearFormFieldError(setFormErrors, 'reportingManagerId');
                    setForm((f) => ({
                      ...f,
                      reportingManagerId: value === '__none__' ? '' : value,
                    }));
                  }}
                >
                  <SelectTrigger id="emp-manager">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.displayName} ({manager.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              <CrmFormField id="emp-location" label="Work location" optional>
                <Input
                  id="emp-location"
                  value={form.workLocation}
                  onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
                />
              </CrmFormField>
              <CrmFormField id="emp-probation" label="Probation end date" optional error={fieldError('probationEndDate')}>
                <Input
                  id="emp-probation"
                  type="date"
                  value={form.probationEndDate}
                  className={formControlStateClass(fieldError('probationEndDate') ? 'invalid' : 'neutral')}
                  onChange={(e) => setForm((f) => ({ ...f, probationEndDate: e.target.value }))}
                />
              </CrmFormField>
              <CrmFormField id="emp-end" label="Employment end date" optional error={fieldError('employmentEndDate')}>
                <Input
                  id="emp-end"
                  type="date"
                  value={form.employmentEndDate}
                  className={formControlStateClass(fieldError('employmentEndDate') ? 'invalid' : 'neutral')}
                  onChange={(e) => setForm((f) => ({ ...f, employmentEndDate: e.target.value }))}
                />
              </CrmFormField>
              <div className={formGridFullWidthClass}>
                <CrmFormField id="emp-notes" label="Notes" optional>
                  <Textarea
                    id="emp-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </CrmFormField>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : editingId ? (
                'Save changes'
              ) : (
                'Create employee'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteTarget?.displayName ?? 'this employee'} from your organization.
              Direct reports must be reassigned first. This action cannot be undone.
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
