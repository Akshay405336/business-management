'use client';

import { Loader2, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { clientNameFieldSchema, createClientRequestSchema } from '@techwin/validation';
import { focusFirstInvalidField } from '@/shared/form/form-control-state';
import { useZodFormFields } from '@/shared/form/use-zod-form-fields';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/shared/lib/format';
import { createClient, getClient, listClients, updateClient } from '../api/clients';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import { CLIENT_STATUSES, CLIENT_TYPES } from '../constants';
import type { ClientStatus, ClientType, CrmClient } from '../types';
import { describeCrmError } from '../utils/errors';
import { labelClientStatus, labelClientType } from '../utils/labels';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_CLIENTS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TablePagination } from '@/features/admin/components/table-pagination';
import {
  CrmErrorAlert,
  CrmFormField,
  CrmLoadingRows,
  CrmPageHeader,
  formGridClass,
  formGridFullWidthClass,
} from './crm-feedback';
import { useAsyncAction } from '../hooks/use-async-action';

type ClientForm = {
  type: ClientType;
  name: string;
  primaryContact: string;
  email: string;
  phone: string;
  website: string;
  billingAddress: string;
  taxRegistration: string;
  status: ClientStatus;
  notes: string;
  sourceLeadId: string;
};

const emptyForm = (): ClientForm => ({
  type: 'COMPANY',
  name: '',
  primaryContact: '',
  email: '',
  phone: '',
  website: '',
  billingAddress: '',
  taxRegistration: '',
  status: 'ACTIVE',
  notes: '',
  sourceLeadId: '',
});

export function ClientsPage() {
  const searchParams = useSearchParams();
  const { pending, run } = useAsyncAction();

  const [clients, setClients] = useState<readonly CrmClient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ClientType>('ALL');

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const clientLiveFields = useZodFormFields(
    { name: clientNameFieldSchema },
    { name: form.name },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmClient | null>(null);

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
    const clientId = searchParams.get('clientId');
    if (clientId) setSelectedId(clientId);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await getClient(selectedId, controller.signal);
        if (!controller.signal.aborted) setDetail(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [selectedId]);

  const filtered = useMemo(() => {
    const items = clients ?? [];
    const term = search.trim().toLowerCase();
    return items.filter((client) => {
      if (statusFilter !== 'ALL' && client.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && client.type !== typeFilter) return false;
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
  }, [clients, search, statusFilter, typeFilter]);

  const filtersActive = statusFilter !== 'ALL' || typeFilter !== 'ALL' || search.trim().length > 0;
  const totalClients = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedClients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: filtered.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: filtered.length });

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setPage(1);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormErrors({});
    clientLiveFields.reset();
    setDialogMode('create');
  };

  const openEdit = (client: CrmClient) => {
    setForm({
      type: client.type,
      name: client.name,
      primaryContact: client.primaryContact,
      email: client.email ?? '',
      phone: client.phone ?? '',
      website: client.website ?? '',
      billingAddress: client.billingAddress,
      taxRegistration: client.taxRegistration,
      status: client.status,
      notes: client.notes,
      sourceLeadId: client.sourceLeadId ?? '',
    });
    setDialogMode('edit');
    setSelectedId(client.id);
  };

  const submit = async () => {
    clientLiveFields.prepareSubmit();
    setError(null);
    const body = {
      type: form.type,
      name: form.name.trim(),
      primaryContact: form.primaryContact.trim() || undefined,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      billingAddress: form.billingAddress.trim() || undefined,
      taxRegistration: form.taxRegistration.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      sourceLeadId: form.sourceLeadId.trim() || null,
    };
    const parsed = createClientRequestSchema.safeParse(body);
    if (!parsed.success) {
      setFormErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    try {
      if (dialogMode === 'create') {
        await run(() => createClient(parsed.data));
      } else if (selectedId) {
        await run(() => updateClient(selectedId, parsed.data));
      }
      setDialogMode(null);
      await load();
      if (selectedId) {
        const refreshed = await getClient(selectedId);
        setDetail(refreshed);
      }
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <CrmPageHeader
        title="Clients"
        description="Manage customer accounts converted from leads or created directly."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'CRM' },
          { label: 'Clients' },
        ]}
        actions={
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" />
            New client
          </Button>
        }
      />

      {error && (clients?.length ?? 0) > 0 ? <CrmErrorAlert message={error} /> : null}

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <InputGroup leading={<Search aria-hidden="true" />} className="sm:col-span-2">
            <Input
              className={cn(inputGroupPaddingClass({ leading: true }))}
              placeholder={CRM_FORM_PLACEHOLDERS.searchClients}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search clients"
            />
          </InputGroup>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'ALL' | ClientStatus)}
          >
            <SelectTrigger>
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
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as 'ALL' | ClientType)}
          >
            <SelectTrigger>
              <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.filterType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {CLIENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {labelClientType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        phase={tablePhase}
        colSpan={5}
        skeletonColumns={CRM_CLIENTS_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        }
        empty={{
          title:
            filtersActive || (clients?.length ?? 0) > 0
              ? 'No results match your filters'
              : 'No clients yet',
          description:
            filtersActive || (clients?.length ?? 0) > 0
              ? 'Try adjusting search, status, or type filters.'
              : 'Create a client account or convert a lead to get started.',
          action:
            filtersActive || (clients?.length ?? 0) > 0
              ? undefined
              : { label: 'New client', onClick: openCreate },
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
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {pagedClients.map((client) => (
          <TableRow
            key={client.id}
            className="cursor-pointer"
            onClick={() => setSelectedId(client.id)}
          >
            <TableCell>
              <div className="grid">
                <span className="font-medium">{client.name}</span>
                <span className="text-muted-foreground text-xs">{client.referenceNumber}</span>
              </div>
            </TableCell>
            <TableCell>{labelClientType(client.type)}</TableCell>
            <TableCell>
              <Badge variant={client.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {labelClientStatus(client.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[12rem] truncate">
              {(client.email ?? client.phone ?? client.primaryContact) || '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(client.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <Sheet open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-[min(28rem,92vw)] overflow-y-auto">
          <SheetTitle className="pr-8">Client details</SheetTitle>
          <SheetDescription className="sr-only">View client profile</SheetDescription>
          {!detail ? (
            <div className="mt-6">
              <CrmLoadingRows rows={5} />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 pb-6 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{detail.referenceNumber}</Badge>
                <Badge>{labelClientType(detail.type)}</Badge>
                <Badge variant={detail.status === 'ACTIVE' ? 'success' : 'secondary'}>
                  {labelClientStatus(detail.status)}
                </Badge>
              </div>
              <div className="grid gap-2">
                <p>
                  <span className="text-muted-foreground">Name:</span> {detail.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Primary contact:</span>{' '}
                  {detail.primaryContact || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {detail.email ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {detail.phone ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Website:</span> {detail.website ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Billing address:</span>{' '}
                  {detail.billingAddress || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Tax registration:</span>{' '}
                  {detail.taxRegistration || '—'}
                </p>
                {detail.notes ? (
                  <p>
                    <span className="text-muted-foreground">Notes:</span> {detail.notes}
                  </p>
                ) : null}
                {detail.sourceLeadId ? (
                  <p>
                    <span className="text-muted-foreground">Source lead:</span>{' '}
                    <Link
                      href={`/admin/leads?search=${encodeURIComponent(detail.sourceLeadId)}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Open leads
                    </Link>
                  </p>
                ) : null}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => openEdit(detail)}>
                Edit client
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Create client' : 'Edit client'}</DialogTitle>
            <DialogDescription>Client records can be linked to a converted lead.</DialogDescription>
          </DialogHeader>
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
            <CrmFormField id="client-status" label="Status">
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((item) => ({ ...item, status: value as ClientStatus }))
                }
              >
                <SelectTrigger id="client-status">
                  <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {labelClientStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
            <CrmFormField
              id="client-name"
              label="Name"
              required
              validated
              error={clientLiveFields.errors.name ?? formErrors.name}
              className={formGridFullWidthClass}
            >
              <Input
                id="client-name"
                placeholder={CRM_FORM_PLACEHOLDERS.clientName}
                value={form.name}
                {...clientLiveFields.controlProps('name', 'client-name')}
                onChange={(event) => {
                  setForm((item) => ({ ...item, name: event.target.value }));
                  clearFormFieldError(setFormErrors, 'name');
                }}
              />
            </CrmFormField>
            <CrmFormField id="client-contact" label="Primary contact" className={formGridFullWidthClass}>
              <Input
                id="client-contact"
                placeholder={CRM_FORM_PLACEHOLDERS.primaryContact}
                value={form.primaryContact}
                onChange={(event) =>
                  setForm((item) => ({ ...item, primaryContact: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="client-email" label="Email">
              <Input
                id="client-email"
                type="email"
                placeholder={CRM_FORM_PLACEHOLDERS.email}
                value={form.email}
                onChange={(event) => setForm((item) => ({ ...item, email: event.target.value }))}
              />
            </CrmFormField>
            <CrmFormField id="client-phone" label="Phone">
              <Input
                id="client-phone"
                placeholder={CRM_FORM_PLACEHOLDERS.phone}
                value={form.phone}
                onChange={(event) => setForm((item) => ({ ...item, phone: event.target.value }))}
              />
            </CrmFormField>
            <CrmFormField id="client-website" label="Website">
              <Input
                id="client-website"
                placeholder={CRM_FORM_PLACEHOLDERS.website}
                value={form.website}
                onChange={(event) => setForm((item) => ({ ...item, website: event.target.value }))}
              />
            </CrmFormField>
            <CrmFormField id="client-billing" label="Billing address" className={formGridFullWidthClass}>
              <Textarea
                id="client-billing"
                placeholder={CRM_FORM_PLACEHOLDERS.billingAddress}
                value={form.billingAddress}
                onChange={(event) =>
                  setForm((item) => ({ ...item, billingAddress: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="client-tax" label="Tax registration">
              <Input
                id="client-tax"
                placeholder={CRM_FORM_PLACEHOLDERS.taxRegistration}
                value={form.taxRegistration}
                onChange={(event) =>
                  setForm((item) => ({ ...item, taxRegistration: event.target.value }))
                }
              />
            </CrmFormField>
            <CrmFormField id="client-lead-id" label="Source lead ID" optional>
              <Input
                id="client-lead-id"
                value={form.sourceLeadId}
                onChange={(event) =>
                  setForm((item) => ({ ...item, sourceLeadId: event.target.value }))
                }
                placeholder={CRM_FORM_PLACEHOLDERS.sourceLeadId}
              />
            </CrmFormField>
            <CrmFormField id="client-notes" label="Notes" className={formGridFullWidthClass}>
              <Textarea
                id="client-notes"
                placeholder={CRM_FORM_PLACEHOLDERS.notes}
                value={form.notes}
                onChange={(event) => setForm((item) => ({ ...item, notes: event.target.value }))}
              />
            </CrmFormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !form.name.trim()}
              onClick={() => void submit()}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
