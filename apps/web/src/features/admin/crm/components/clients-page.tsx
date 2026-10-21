'use client';

import { leadEmailSchema, leadPhoneSchema, clientNameFieldSchema, createClientRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, mergeFieldErrors, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import { Loader2, Pencil, Plus, Power, Search, Trash2, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
import { CRM_CLIENTS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TableIconButton } from '@/features/admin/components/table-icon-button';
import { TablePagination } from '@/features/admin/components/table-pagination';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  createClient,
  deleteClient,
  listClients,
  previewClientReference,
  updateClient,
} from '../api/clients';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { CLIENT_STATUSES, CLIENT_TYPES } from '../constants';
import type { ClientStatus, ClientType, CrmClient } from '../types';
import { describeCrmError } from '../utils/errors';
import { labelClientStatus, labelClientType } from '../utils/labels';
import { CrmErrorAlert, CrmFormField, formGridClass, formGridFullWidthClass } from './crm-feedback';
import { CRM_HEADER_SEARCH_FORM_CLASS, CrmToolbarHeader } from './crm-toolbar-header';
import { useAsyncAction } from '../hooks/use-async-action';

const SEARCH_DEBOUNCE_MS = 400;

type ClientForm = {
  type: ClientType;
  referenceNumber: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  billingAddress: string;
  taxRegistration: string;
  notes: string;
};

const emptyForm = (): ClientForm => ({
  type: 'INDIVIDUAL',
  referenceNumber: '',
  name: '',
  companyName: '',
  email: '',
  phone: '',
  website: '',
  billingAddress: '',
  taxRegistration: '',
  notes: '',
});

export function ClientsPage() {
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const { pending, run } = useAsyncAction();

  const [clients, setClients] = useState<readonly CrmClient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(() => emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [referencePreviewHint, setReferencePreviewHint] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CrmClient | null>(null);

  const clientLiveFields = useZodFormFields(
    {
      name: clientNameFieldSchema,
      email: leadEmailSchema,
      phone: leadPhoneSchema,
    },
    {
      name: form.name,
      email: form.email.trim() === '' ? null : form.email,
      phone: form.phone.trim() === '' ? null : form.phone,
    },
  );

  const fieldError = (key: string) => mergeFieldErrors(clientLiveFields.errors, formErrors, key);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listClients();
      setClients(result.clients);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (searchDraft === search) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchDraft, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const items = clients ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((client) => {
      if (statusFilter !== 'ALL' && client.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        client.name,
        client.referenceNumber,
        client.primaryContact,
        client.email ?? '',
        client.phone ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, search, statusFilter]);

  const hasAnyClients = (clients?.length ?? 0) > 0;
  const filtersActive = statusFilter !== 'ALL' || search.trim().length > 0;
  const totalClients = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedClients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: hasAnyClients ? filtered.length : 0,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: filtered.length });

  useEffect(() => {
    if (!dialogOpen || editingId) return;
    const controller = new AbortController();
    setForm((f) => ({ ...f, referenceNumber: '' }));
    setReferencePreviewHint('Loading next client number…');
    void previewClientReference(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((f) => ({ ...f, referenceNumber: result.referenceNumber }));
        setReferencePreviewHint('Preview only — the server assigns the final number when you save.');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setReferencePreviewHint('Could not load number preview.');
      });
    return () => controller.abort();
  }, [dialogOpen, editingId]);

  const clearFilters = () => {
    setSearchDraft('');
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const resetForm = () => {
    setForm(emptyForm());
    setFormErrors({});
    clientLiveFields.reset();
    setReferencePreviewHint('');
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = useCallback(
    (client: CrmClient) => {
      setEditingId(client.id);
      setForm({
        type: client.type,
        referenceNumber: client.referenceNumber,
        name: client.name,
        companyName: client.primaryContact,
        email: client.email ?? '',
        phone: client.phone ?? '',
        website: client.website ?? '',
        billingAddress: client.billingAddress,
        taxRegistration: client.taxRegistration,
        notes: client.notes,
      });
      setFormErrors({});
      clientLiveFields.reset();
      setDialogOpen(true);
    },
    [clientLiveFields],
  );

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (!clientId || !clients) return;
    const client = clients.find((item) => item.id === clientId);
    if (client) openEdit(client);
  }, [searchParams, clients, openEdit]);

  const submit = async () => {
    clientLiveFields.prepareSubmit();
    setFormErrors({});
    const body = {
      type: form.type,
      name: form.name.trim(),
      primaryContact: form.companyName.trim() || undefined,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      billingAddress: form.billingAddress.trim() || undefined,
      taxRegistration: form.taxRegistration.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...(editingId ? {} : { status: 'ACTIVE' as const }),
    };
    const parsed = createClientRequestSchema.safeParse(body);
    if (!parsed.success) {
      setFormErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      if (editingId) {
        await run(() => updateClient(editingId, parsed.data));
        toast.success('Client updated.');
      } else {
        const created = await run(() => createClient(parsed.data));
        toast.success(
          created ? `Client saved as ${created.referenceNumber}.` : 'Client saved successfully.',
        );
      }
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const toggleStatus = async (client: CrmClient) => {
    const next: ClientStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await run(() => updateClient(client.id, { status: next }));
      toast.success(next === 'ACTIVE' ? 'Client activated.' : 'Client deactivated.');
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await run(() => deleteClient(target.id));
      toast.success(`Client "${target.name}" permanently deleted.`);
      if (editingId === target.id) {
        setDialogOpen(false);
        setEditingId(null);
        resetForm();
      }
      await load();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    }
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'CRM' },
    { label: 'Clients' },
  ] as const;

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3">
      <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-0.5" />
      <CrmToolbarHeader
        title="Clients"
        description="Manage your clients and contact details."
        className="shadow-xs"
        titleSectionClassName="xl:max-w-none xl:min-w-0 xl:flex-[1_1_auto]"
        descriptionClassName="xl:whitespace-nowrap"
        toolbar={
          <>
            <form
              className={CRM_HEADER_SEARCH_FORM_CLASS}
              onSubmit={(event) => {
                event.preventDefault();
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                setSearch(searchDraft.trim());
                setPage(1);
              }}
            >
              <InputGroup leading={<Search aria-hidden="true" />} className="min-w-0 max-w-full">
                <Input
                  className={cn('h-9', inputGroupPaddingClass({ leading: true }))}
                  placeholder={CRM_FORM_PLACEHOLDERS.searchClients}
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  aria-label="Search clients"
                />
              </InputGroup>
            </form>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'ALL' | ClientStatus)}
            >
              <SelectTrigger
                className="h-9 w-full min-w-0 sm:w-[9.375rem] sm:max-w-[10rem]"
                aria-label="Filter by status"
              >
                <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.filterStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {CLIENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {labelClientStatus(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={openCreate}>
              <Plus aria-hidden="true" />
              New client
            </Button>
          </>
        }
      />

      {error && (clients?.length ?? 0) > 0 ? <CrmErrorAlert message={error} /> : null}

      <DataTable
        className="min-w-0 max-w-full"
        tableClassName="table-fixed"
        phase={tablePhase}
        colSpan={7}
        skeletonColumns={CRM_CLIENTS_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[18%]">Client</TableHead>
            <TableHead className="w-[12%]">Client number</TableHead>
            <TableHead className="w-[10%]">Type</TableHead>
            <TableHead className="w-[14%]">Phone</TableHead>
            <TableHead className="w-[18%]">Email</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[18%] text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          icon: Users,
          title: filtersActive ? 'No results match your filters' : 'No clients yet',
          description: filtersActive
            ? 'Try different search terms or clear filters to see all clients.'
            : 'Create a client to manage contact details and quotations.',
          secondaryAction: filtersActive
            ? { label: 'Clear filters', onClick: clearFilters }
            : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={totalClients}
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
        {pagedClients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="min-w-0 font-medium truncate">{client.name}</TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate text-xs font-mono">
              {client.referenceNumber}
            </TableCell>
            <TableCell className="truncate">{labelClientType(client.type)}</TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate">
              {client.phone ?? '—'}
            </TableCell>
            <TableCell className="text-muted-foreground min-w-0 truncate">
              {client.email ?? '—'}
            </TableCell>
            <TableCell>
              {client.status === 'ACTIVE' ? (
                <Badge className="border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">{labelClientStatus(client.status)}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <TableIconButton
                  label={client.status === 'ACTIVE' ? `Deactivate ${client.name}` : `Activate ${client.name}`}
                  tone={client.status === 'ACTIVE' ? 'success' : 'danger'}
                  disabled={pending}
                  onClick={() => void toggleStatus(client)}
                >
                  <Power className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Edit ${client.name}`}
                  tone="primary"
                  disabled={pending}
                  onClick={() => openEdit(client)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </TableIconButton>
                <TableIconButton
                  label={`Permanently delete ${client.name}`}
                  tone="danger"
                  disabled={pending}
                  onClick={() => setDeleteTarget(client)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TableIconButton>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

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
        <DialogContent className="flex max-h-[92vh] max-w-none w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden p-0 sm:w-[min(640px,calc(100vw-64px))] sm:max-w-none">
          <DialogHeader className="shrink-0 border-b px-5 py-3">
            <DialogTitle>{editingId ? 'Edit client' : 'Create client'}</DialogTitle>
            <DialogDescription>
              Client records can be linked to quotations and converted leads.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
            <div className={formGridClass}>
              <CrmFormField id="client-type" label="Type">
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((item) => ({ ...item, type: value as ClientType }))
                  }
                >
                  <SelectTrigger id="client-type">
                    <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelClientType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CrmFormField>
              <CrmFormField id="client-number" label="Client number">
                <Input
                  id="client-number"
                  readOnly
                  value={form.referenceNumber}
                  placeholder={CRM_FORM_PLACEHOLDERS.packageCodeLoading}
                  className="bg-muted/40 font-mono text-sm"
                />
                {!editingId && referencePreviewHint ? (
                  <p className="text-muted-foreground text-xs">{referencePreviewHint}</p>
                ) : null}
              </CrmFormField>
              <CrmFormField
                id="client-name"
                label="Client name"
                required
                validated
                error={fieldError('name')}
              >
                <Input
                  id="client-name"
                  placeholder={CRM_FORM_PLACEHOLDERS.clientName}
                  className={formControlStateClass(clientLiveFields.controlState('name'))}
                  value={form.name}
                  {...clientLiveFields.controlProps('name', 'client-name')}
                  onChange={(event) => {
                    setForm((item) => ({ ...item, name: event.target.value }));
                    clearFormFieldError(setFormErrors, 'name');
                  }}
                />
              </CrmFormField>
              <CrmFormField id="client-company" label="Company name" optional>
                <Input
                  id="client-company"
                  placeholder={CRM_FORM_PLACEHOLDERS.company}
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, companyName: event.target.value }))
                  }
                />
              </CrmFormField>
              <CrmFormField
                id="client-phone"
                label="Phone number"
                validated
                error={fieldError('phone')}
              >
                <Input
                  id="client-phone"
                  placeholder={CRM_FORM_PLACEHOLDERS.phone}
                  className={formControlStateClass(clientLiveFields.controlState('phone'))}
                  value={form.phone}
                  {...clientLiveFields.controlProps('phone', 'client-phone')}
                  onChange={(event) => {
                    setForm((item) => ({ ...item, phone: event.target.value }));
                    clearFormFieldError(setFormErrors, 'phone');
                  }}
                />
              </CrmFormField>
              <CrmFormField
                id="client-email"
                label="Email address"
                validated
                error={fieldError('email')}
              >
                <Input
                  id="client-email"
                  type="email"
                  placeholder={CRM_FORM_PLACEHOLDERS.email}
                  className={formControlStateClass(clientLiveFields.controlState('email'))}
                  value={form.email}
                  {...clientLiveFields.controlProps('email', 'client-email')}
                  onChange={(event) => {
                    setForm((item) => ({ ...item, email: event.target.value }));
                    clearFormFieldError(setFormErrors, 'email');
                  }}
                />
              </CrmFormField>
              <CrmFormField id="client-website" label="Website" optional>
                <Input
                  id="client-website"
                  placeholder={CRM_FORM_PLACEHOLDERS.website}
                  value={form.website}
                  onChange={(event) => setForm((item) => ({ ...item, website: event.target.value }))}
                />
              </CrmFormField>
              <CrmFormField id="client-tax" label="Tax registration" optional>
                <Input
                  id="client-tax"
                  placeholder={CRM_FORM_PLACEHOLDERS.taxRegistration}
                  value={form.taxRegistration}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, taxRegistration: event.target.value }))
                  }
                />
              </CrmFormField>
              <CrmFormField id="client-billing" label="Billing address" optional className={formGridFullWidthClass}>
                <Textarea
                  id="client-billing"
                  placeholder={CRM_FORM_PLACEHOLDERS.billingAddress}
                  value={form.billingAddress}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, billingAddress: event.target.value }))
                  }
                />
              </CrmFormField>
              <CrmFormField id="client-notes" label="Notes" optional className={formGridFullWidthClass}>
                <Textarea
                  id="client-notes"
                  placeholder={CRM_FORM_PLACEHOLDERS.notes}
                  value={form.notes}
                  onChange={(event) => setForm((item) => ({ ...item, notes: event.target.value }))}
                />
              </CrmFormField>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setDialogOpen(false);
                setEditingId(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void submit()}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {editingId ? 'Update client' : 'Save client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete ${deleteTarget.referenceNumber} (${deleteTarget.name})? Linked quotations keep their snapshot data; this cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
