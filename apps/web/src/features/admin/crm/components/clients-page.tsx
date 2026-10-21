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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/shared/lib/format';
import { createClient, getClient, listClients, updateClient } from '../api/clients';
import { CLIENT_STATUSES, CLIENT_TYPES } from '../constants';
import type { ClientStatus, ClientType, CrmClient } from '../types';
import { describeCrmError } from '../utils/errors';
import { labelClientStatus, labelClientType } from '../utils/labels';
import { DataTableFrame } from '@/features/admin/components/data-table';
import { CrmEmptyState, CrmErrorAlert, CrmLoadingRows, CrmPageHeader } from './crm-feedback';
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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClientStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ClientType>('ALL');

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmClient | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await listClients();
      setClients(result.clients);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
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

  const openCreate = () => {
    setForm(emptyForm());
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
    if (!form.name.trim()) return;
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
    try {
      if (dialogMode === 'create') {
        await run(() => createClient(body));
      } else if (selectedId) {
        await run(() => updateClient(selectedId, body));
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

      {error ? <CrmErrorAlert message={error} /> : null}

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
              aria-hidden="true"
            />
            <Input
              className="pl-8"
              placeholder="Search clients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'ALL' | ClientStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
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
              <SelectValue placeholder="Type" />
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

      {clients === null && !error ? <CrmLoadingRows rows={5} /> : null}

      {clients && filtered.length === 0 ? (
        <CrmEmptyState title="No clients found" description="Adjust filters or create a client." />
      ) : null}

      {filtered.length > 0 ? (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(client.id)}
                >
                  <TableCell>
                    <div className="grid">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {client.referenceNumber}
                      </span>
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
            </TableBody>
          </Table>
        </DataTableFrame>
      ) : null}

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
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((item) => ({ ...item, type: value as ClientType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {labelClientType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((item) => ({ ...item, status: value as ClientStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {labelClientStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                value={form.name}
                onChange={(event) => setForm((item) => ({ ...item, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-contact">Primary contact</Label>
              <Input
                id="client-contact"
                value={form.primaryContact}
                onChange={(event) =>
                  setForm((item) => ({ ...item, primaryContact: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((item) => ({ ...item, email: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={(event) => setForm((item) => ({ ...item, phone: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-website">Website</Label>
              <Input
                id="client-website"
                value={form.website}
                onChange={(event) => setForm((item) => ({ ...item, website: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-billing">Billing address</Label>
              <Textarea
                id="client-billing"
                value={form.billingAddress}
                onChange={(event) =>
                  setForm((item) => ({ ...item, billingAddress: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-tax">Tax registration</Label>
              <Input
                id="client-tax"
                value={form.taxRegistration}
                onChange={(event) =>
                  setForm((item) => ({ ...item, taxRegistration: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-lead-id">Source lead ID (optional)</Label>
              <Input
                id="client-lead-id"
                value={form.sourceLeadId}
                onChange={(event) =>
                  setForm((item) => ({ ...item, sourceLeadId: event.target.value }))
                }
                placeholder="UUID from a converted lead"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="client-notes">Notes</Label>
              <Textarea
                id="client-notes"
                value={form.notes}
                onChange={(event) => setForm((item) => ({ ...item, notes: event.target.value }))}
              />
            </div>
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
