'use client';

import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  changeProposalStatus,
  createProposal,
  getProposal,
  listProposals,
  updateProposal,
} from '../api/proposals';
import { PROPOSAL_STATUSES, PROPOSAL_TYPES } from '../constants';
import type { CrmProposal, ProposalDocumentType, ProposalStatus } from '../types';
import { formatDateOnly, formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelProposalStatus, labelProposalType } from '../utils/labels';
import { DataTableFrame } from '@/features/admin/components/data-table';
import { CrmEmptyState, CrmErrorAlert, CrmLoadingRows, CrmPageHeader } from './crm-feedback';
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
});

export function ProposalsPage() {
  const { pending, run } = useAsyncAction();
  const [proposals, setProposals] = useState<readonly CrmProposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProposalStatus>('ALL');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<ProposalForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusDialogId, setStatusDialogId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<ProposalStatus>('SENT');
  const [statusNote, setStatusNote] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await listProposals();
      setProposals(result.proposals);
      setError(null);
    } catch (failure) {
      setError(describeCrmError(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const items = proposals ?? [];
    if (statusFilter === 'ALL') return items;
    return items.filter((proposal) => proposal.status === statusFilter);
  }, [proposals, statusFilter]);

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

    const body = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate.trim() || null,
      currency: form.currency.trim() || undefined,
      notes: form.notes.trim() || undefined,
      terms: form.terms.trim() || undefined,
      lineItems,
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

      {error ? <CrmErrorAlert message={error} /> : null}

      <Card>
        <CardContent className="pt-6 sm:max-w-xs">
          <Label className="mb-1.5">Filter by status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as 'ALL' | ProposalStatus)}
          >
            <SelectTrigger>
              <SelectValue />
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

      {proposals === null && !error ? <CrmLoadingRows rows={5} /> : null}

      {proposals && filtered.length === 0 ? (
        <CrmEmptyState title="No proposals yet" description="Create a proposal or quotation." />
      ) : null}

      {filtered.length > 0 ? (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Issue date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((proposal) => (
                <TableRow key={proposal.id}>
                    <TableCell>
                      <div className="grid">
                        <span className="font-medium">{proposal.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {proposal.documentNumber}
                        </span>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void openEdit(proposal.id)}
                        >
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
              </TableBody>
            </Table>
        </DataTableFrame>
      ) : null}

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
            <div className="grid gap-3 sm:grid-cols-2">
              {dialogMode === 'create' ? (
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm((item) => ({ ...item, type: value as ProposalDocumentType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {labelProposalType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor="proposal-title">Title</Label>
                <Input
                  id="proposal-title"
                  value={form.title}
                  onChange={(event) => setForm((item) => ({ ...item, title: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="proposal-currency">Currency</Label>
                <Input
                  id="proposal-currency"
                  value={form.currency}
                  maxLength={3}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, currency: event.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proposal-description">Description</Label>
              <Textarea
                id="proposal-description"
                value={form.description}
                onChange={(event) =>
                  setForm((item) => ({ ...item, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="proposal-issue">Issue date</Label>
                <Input
                  id="proposal-issue"
                  type="date"
                  value={form.issueDate}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, issueDate: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="proposal-expiry">Expiry date</Label>
                <Input
                  id="proposal-expiry"
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, expiryDate: event.target.value }))
                  }
                />
              </div>
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
                    placeholder="Name"
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
                    placeholder="Description"
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
                      placeholder="Qty"
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
                      placeholder="Unit"
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
                      placeholder="Unit price"
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
                      placeholder="Tax %"
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
                value={form.notes}
                onChange={(event) => setForm((item) => ({ ...item, notes: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="proposal-terms">Terms</Label>
              <Textarea
                id="proposal-terms"
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
                  <SelectValue />
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
