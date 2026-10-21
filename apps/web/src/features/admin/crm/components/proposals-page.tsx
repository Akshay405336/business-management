'use client';

import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/shared/lib/utils';
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
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  changeProposalStatus,
  createProposal,
  getProposal,
  listProposals,
  updateProposal,
} from '../api/proposals';
import { listServicePackages } from '../api/service-packages';
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from '../constants';
import { CRM_FORM_PLACEHOLDERS } from '../constants/form-placeholders';
import type { CrmProposal, ProposalDocumentType, ProposalStatus } from '../types';
import { formatDateOnly, formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelProposalStatus, labelProposalType } from '../utils/labels';
import {
  DataTable,
  deriveDataTablePhase,
  isDataTableRefreshing,
} from '@/features/admin/components/data-table';
import { CRM_PROPOSALS_TABLE_SKELETON } from '@/features/admin/components/data-table-presets';
import { TablePagination } from '@/features/admin/components/table-pagination';
import {
  CrmErrorAlert,
  CrmFormField,
  CrmPageHeader,
  formGridClass,
  formGridFullWidthClass,
} from './crm-feedback';
import { useAsyncAction } from '../hooks/use-async-action';

type LineItemDraft = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
};

type ProposalForm = {
  type: ProposalDocumentType;
  title: string;
  description: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  notes: string;
  terms: string;
  lineItems: LineItemDraft[];
  sourcePackageId: string;
};

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const emptyLineItem = (): LineItemDraft => ({
  key: crypto.randomUUID(),
  name: '',
  description: '',
  quantity: '1',
  unit: 'ea',
  unitPrice: '0',
  discount: '0',
  taxRate: '0',
});

const emptyForm = (): ProposalForm => ({
  type: 'PROPOSAL',
  title: '',
  description: '',
  issueDate: todayIsoDate(),
  expiryDate: '',
  currency: 'USD',
  notes: '',
  terms: '',
  lineItems: [emptyLineItem()],
  sourcePackageId: '',
});

export function ProposalsPage() {
  const { pending, run } = useAsyncAction();
  const [proposals, setProposals] = useState<readonly CrmProposal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProposalStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ProposalForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusDialogId, setStatusDialogId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<ProposalStatus>('SENT');
  const [statusNote, setStatusNote] = useState('');
  const [servicePackages, setServicePackages] = useState<
    readonly { id: string; name: string; code: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProposals();
      setProposals(result.proposals);
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
    void listServicePackages()
      .then((result) =>
        setServicePackages(
          result.packages.map((pkg) => ({ id: pkg.id, name: pkg.name, code: pkg.code })),
        ),
      )
      .catch(() => setServicePackages([]));
  }, []);

  const filtered = useMemo(() => {
    const items = proposals ?? [];
    if (statusFilter === 'ALL') return items;
    return items.filter((proposal) => proposal.status === statusFilter);
  }, [proposals, statusFilter]);

  const statusFilterActive = statusFilter !== 'ALL';
  const totalProposals = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalProposals / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedProposals = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const tablePhase = deriveDataTablePhase({
    loading,
    error,
    rowCount: filtered.length,
  });
  const tableRefreshing = isDataTableRefreshing({ loading, rowCount: filtered.length });

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setDialogMode('create');
  };

  const openEdit = async (id: string) => {
    setError(null);
    try {
      const proposal = await getProposal(id);
      setEditingId(id);
      setForm({
        type: proposal.type,
        title: proposal.title,
        description: proposal.description,
        issueDate: proposal.issueDate,
        expiryDate: proposal.expiryDate ?? '',
        currency: proposal.currency,
        notes: proposal.notes,
        terms: proposal.terms,
        lineItems: proposal.lineItems.map((item) => ({
          key: item.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
        sourcePackageId: proposal.sourcePackageId ?? '',
      });
      setDialogMode('edit');
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setError(null);
    const lineItems = form.lineItems
      .filter((item) => item.name.trim())
      .map((item, index) => ({
        name: item.name.trim(),
        description: item.description.trim() || undefined,
        quantity: item.quantity || '1',
        unit: item.unit.trim() || undefined,
        unitPrice: item.unitPrice || '0',
        discount: item.discount || '0',
        taxRate: item.taxRate || '0',
        sortOrder: index,
      }));

    const sourcePackageId = form.sourcePackageId.trim() || null;
    const body = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate.trim() || null,
      currency: sourcePackageId ? 'INR' : form.currency.trim() || undefined,
      notes: form.notes.trim() || undefined,
      terms: form.terms.trim() || undefined,
      sourcePackageId,
      lineItems: sourcePackageId ? undefined : lineItems,
    };

    try {
      if (dialogMode === 'create') {
        await run(() => createProposal(body));
      } else if (editingId) {
        const { type: _type, ...updateBody } = body;
        await run(() => updateProposal(editingId, updateBody));
      }
      setDialogMode(null);
      await load();
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  };

  const submitStatus = async () => {
    if (!statusDialogId) return;
    setError(null);
    try {
      await run(() =>
        changeProposalStatus(statusDialogId, {
          status: nextStatus,
          note: statusNote.trim() || undefined,
        }),
      );
      setStatusDialogId(null);
      setStatusNote('');
      await load();
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <CrmPageHeader
        title="Proposals & Quotations"
        description="Create quotations and proposals with line items and status tracking."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'CRM' },
          { label: 'Proposals & Quotations' },
        ]}
        actions={
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" />
            New document
          </Button>
        }
      />

      {error && (proposals?.length ?? 0) > 0 ? <CrmErrorAlert message={error} /> : null}

      <Card>
        <CardContent className="pt-6 sm:max-w-xs">
          <Label className="mb-1.5">Filter by status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'ALL' | ProposalStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {PROPOSAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {labelProposalStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        phase={tablePhase}
        colSpan={6}
        skeletonColumns={CRM_PROPOSALS_TABLE_SKELETON}
        header={
          <TableRow className="hover:bg-transparent">
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Issue date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        empty={{
          title:
            statusFilterActive || (proposals?.length ?? 0) > 0
              ? 'No results match your filters'
              : 'No proposals yet',
          description:
            statusFilterActive || (proposals?.length ?? 0) > 0
              ? 'Try a different status filter or clear filters to see all documents.'
              : 'Create a proposal or quotation with line items and status tracking.',
          action:
            statusFilterActive || (proposals?.length ?? 0) > 0
              ? undefined
              : { label: 'New document', onClick: openCreate },
          secondaryAction: statusFilterActive
            ? { label: 'Clear filters', onClick: () => setStatusFilter('ALL') }
            : undefined,
        }}
        errorMessage={error}
        onRetry={() => void load()}
        refreshing={tableRefreshing}
        footer={
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={totalProposals}
            loading={tablePhase === 'initial-loading'}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        }
      >
        {pagedProposals.map((proposal) => (
          <TableRow key={proposal.id}>
            <TableCell>
              <div className="grid">
                <span className="font-medium">{proposal.title}</span>
                <span className="text-muted-foreground text-xs">{proposal.documentNumber}</span>
              </div>
            </TableCell>
            <TableCell>{labelProposalType(proposal.type)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{labelProposalStatus(proposal.status)}</Badge>
            </TableCell>
            <TableCell>{formatMoney(proposal.grandTotal, proposal.currency)}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateOnly(proposal.issueDate)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => void openEdit(proposal.id)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusDialogId(proposal.id);
                    setNextStatus(proposal.status === 'DRAFT' ? 'SENT' : proposal.status);
                  }}
                >
                  Status
                </Button>
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={`/admin/proposals/${proposal.id}/print`} target="_blank">
                    <ExternalLink aria-hidden="true" />
                    Print
                  </Link>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <Dialog open={dialogMode !== null} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create proposal' : 'Edit proposal'}
            </DialogTitle>
            <DialogDescription>
              Line items, totals, and terms are calculated by the API.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={formGridClass}>
              {dialogMode === 'create' ? (
                <CrmFormField id="proposal-type" label="Type">
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((item) => ({ ...item, type: value as ProposalDocumentType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectType} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {labelProposalType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CrmFormField>
              ) : null}
              {dialogMode === 'create' ? (
                <CrmFormField
                  id="proposal-package"
                  label="Service package"
                  optional
                  className={formGridFullWidthClass}
                >
                  <Select
                    value={form.sourcePackageId || 'NONE'}
                    onValueChange={(value) =>
                      setForm((item) => ({
                        ...item,
                        sourcePackageId: value === 'NONE' ? '' : value,
                        currency: value === 'NONE' ? item.currency : 'INR',
                      }))
                    }
                  >
                    <SelectTrigger id="proposal-package">
                      <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectPackage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Manual line items</SelectItem>
                      {servicePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CrmFormField>
              ) : null}
              {dialogMode === 'create' ? (
                <p className={cn('text-muted-foreground text-xs', formGridFullWidthClass)}>
                  Choosing a package snapshots its configuration and pricing on the quotation.
                </p>
              ) : null}
              <CrmFormField id="proposal-title" label="Title">
                <Input
                  id="proposal-title"
                  placeholder={CRM_FORM_PLACEHOLDERS.proposalTitle}
                  value={form.title}
                  onChange={(event) => setForm((item) => ({ ...item, title: event.target.value }))}
                />
              </CrmFormField>
              <CrmFormField id="proposal-currency" label="Currency">
                <Input
                  id="proposal-currency"
                  placeholder={CRM_FORM_PLACEHOLDERS.currency}
                  value={form.currency}
                  maxLength={3}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, currency: event.target.value.toUpperCase() }))
                  }
                />
              </CrmFormField>
            </div>
            <CrmFormField id="proposal-description" label="Description">
              <Textarea
                id="proposal-description"
                placeholder={CRM_FORM_PLACEHOLDERS.proposalDescription}
                value={form.description}
                onChange={(event) =>
                  setForm((item) => ({ ...item, description: event.target.value }))
                }
              />
            </CrmFormField>
            <div className={formGridClass}>
              <CrmFormField id="proposal-issue" label="Issue date">
                <Input
                  id="proposal-issue"
                  type="date"
                  placeholder={CRM_FORM_PLACEHOLDERS.issueDate}
                  value={form.issueDate}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, issueDate: event.target.value }))
                  }
                />
              </CrmFormField>
              <CrmFormField id="proposal-expiry" label="Expiry date">
                <Input
                  id="proposal-expiry"
                  type="date"
                  placeholder={CRM_FORM_PLACEHOLDERS.expiryDate}
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, expiryDate: event.target.value }))
                  }
                />
              </CrmFormField>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((item) => ({
                      ...item,
                      lineItems: [...item.lineItems, emptyLineItem()],
                    }))
                  }
                >
                  <Plus aria-hidden="true" />
                  Add line
                </Button>
              </div>
              {form.lineItems.map((item, index) => (
                <div key={item.key} className="grid gap-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase">Item {index + 1}</p>
                    {form.lineItems.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove line item"
                        onClick={() =>
                          setForm((value) => ({
                            ...value,
                            lineItems: value.lineItems.filter((row) => row.key !== item.key),
                          }))
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    placeholder={CRM_FORM_PLACEHOLDERS.lineItemName}
                    value={item.name}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        lineItems: value.lineItems.map((row) =>
                          row.key === item.key ? { ...row, name: event.target.value } : row,
                        ),
                      }))
                    }
                  />
                  <Textarea
                    placeholder={CRM_FORM_PLACEHOLDERS.lineItemDescription}
                    value={item.description}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        lineItems: value.lineItems.map((row) =>
                          row.key === item.key ? { ...row, description: event.target.value } : row,
                        ),
                      }))
                    }
                  />
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input
                      placeholder={CRM_FORM_PLACEHOLDERS.quantity}
                      value={item.quantity}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          lineItems: value.lineItems.map((row) =>
                            row.key === item.key ? { ...row, quantity: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                    <Input
                      placeholder={CRM_FORM_PLACEHOLDERS.unit}
                      value={item.unit}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          lineItems: value.lineItems.map((row) =>
                            row.key === item.key ? { ...row, unit: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                    <Input
                      placeholder={CRM_FORM_PLACEHOLDERS.unitPrice}
                      value={item.unitPrice}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          lineItems: value.lineItems.map((row) =>
                            row.key === item.key ? { ...row, unitPrice: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                    <Input
                      placeholder={CRM_FORM_PLACEHOLDERS.taxPercent}
                      value={item.taxRate}
                      onChange={(event) =>
                        setForm((value) => ({
                          ...value,
                          lineItems: value.lineItems.map((row) =>
                            row.key === item.key ? { ...row, taxRate: event.target.value } : row,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="proposal-notes">Notes</Label>
              <Textarea
                id="proposal-notes"
                placeholder={CRM_FORM_PLACEHOLDERS.proposalNotes}
                value={form.notes}
                onChange={(event) => setForm((item) => ({ ...item, notes: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proposal-terms">Terms</Label>
              <Textarea
                id="proposal-terms"
                placeholder={CRM_FORM_PLACEHOLDERS.proposalTerms}
                value={form.terms}
                onChange={(event) => setForm((item) => ({ ...item, terms: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogMode(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !form.title.trim()}
              onClick={() => void submit()}
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogId !== null} onOpenChange={() => setStatusDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>Record a workflow transition for this document.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={nextStatus}
                onValueChange={(value) => setNextStatus(value as ProposalStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={CRM_FORM_PLACEHOLDERS.selectStatus} />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {labelProposalStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="status-note">Note (optional)</Label>
              <Textarea
                id="status-note"
                placeholder={CRM_FORM_PLACEHOLDERS.statusNote}
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusDialogId(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void submitStatus()}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Update status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
