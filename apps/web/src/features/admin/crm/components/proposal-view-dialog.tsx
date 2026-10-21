'use client';

import {
  computeProposalLinePricing,
  computeProposalSummaryTotals,
  proposalTaxRateFractionToPercentDisplay,
} from '@techwin/validation';
import { FileText, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CrmProposal } from '../types';
import { formatDateOnly, formatMoney } from '../utils/format';
import { labelProposalType } from '../utils/labels';
import { ProposalStatusBadge } from './proposal-status-badge';

export function ProposalViewDialog({
  open,
  proposal,
  loading,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  proposal: CrmProposal | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
}) {
  const summary = proposal
    ? computeProposalSummaryTotals(
        proposal.lineItems.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" aria-hidden="true" />
            {proposal ? proposal.documentNumber : 'Document details'}
          </DialogTitle>
          <DialogDescription>
            {proposal
              ? `${labelProposalType(proposal.type)} · ${proposal.title}`
              : 'Loading document…'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading || !proposal ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading document…
            </div>
          ) : (
            <div className="grid gap-6">
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Document</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Type</dt>
                    <dd>{labelProposalType(proposal.type)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Status</dt>
                    <dd>
                      <ProposalStatusBadge status={proposal.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Quotation date</dt>
                    <dd>{formatDateOnly(proposal.issueDate)}</dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Client</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Client name</dt>
                    <dd>{proposal.clientName}</dd>
                  </div>
                  {proposal.companyName ? (
                    <div>
                      <dt className="text-muted-foreground text-xs">Company</dt>
                      <dd>{proposal.companyName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground text-xs">Phone</dt>
                    <dd>{proposal.clientPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Email</dt>
                    <dd>{proposal.clientEmail}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">Billing address</dt>
                    <dd className="whitespace-pre-wrap">{proposal.billingAddress}</dd>
                  </div>
                  {proposal.clientGstin ? (
                    <div>
                      <dt className="text-muted-foreground text-xs">GSTIN</dt>
                      <dd>{proposal.clientGstin}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {(proposal.description ||
                proposal.scopeOfWork ||
                proposal.terms ||
                proposal.notes ||
                proposal.paymentTerms ||
                proposal.deliveryTimeline) && (
                <section className="grid gap-2">
                  <h3 className="text-sm font-semibold">Description & terms</h3>
                  <dl className="grid gap-3 text-sm">
                    {proposal.description ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Overview</dt>
                        <dd className="whitespace-pre-wrap">{proposal.description}</dd>
                      </div>
                    ) : null}
                    {proposal.scopeOfWork ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Scope of work</dt>
                        <dd className="whitespace-pre-wrap">{proposal.scopeOfWork}</dd>
                      </div>
                    ) : null}
                    {proposal.paymentTerms ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Payment terms</dt>
                        <dd className="whitespace-pre-wrap">{proposal.paymentTerms}</dd>
                      </div>
                    ) : null}
                    {proposal.deliveryTimeline ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Delivery timeline</dt>
                        <dd className="whitespace-pre-wrap">{proposal.deliveryTimeline}</dd>
                      </div>
                    ) : null}
                    {proposal.terms ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Terms & conditions</dt>
                        <dd className="whitespace-pre-wrap">{proposal.terms}</dd>
                      </div>
                    ) : null}
                    {proposal.notes ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Notes</dt>
                        <dd className="whitespace-pre-wrap">{proposal.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              )}

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Line items</h3>
                {proposal.lineItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No line items.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit price</TableHead>
                          <TableHead className="text-right">GST</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposal.lineItems.map((item, index) => {
                          const row = computeProposalLinePricing({
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            discount: item.discount,
                            taxRate: item.taxRate,
                          });
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                              <TableCell>
                                <div className="font-medium">{item.name}</div>
                                {item.category ? (
                                  <div className="text-muted-foreground text-xs">{item.category}</div>
                                ) : null}
                                {item.description ? (
                                  <div className="text-muted-foreground mt-0.5 text-xs whitespace-pre-wrap">
                                    {item.description}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {item.quantity} {item.unit}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(item.unitPrice, proposal.currency)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {proposalTaxRateFractionToPercentDisplay(item.taxRate)}%
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(row.lineTotal, proposal.currency)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {summary ? (
                  <dl className="ml-auto grid w-full max-w-xs gap-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="tabular-nums">{formatMoney(summary.subtotal, proposal.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Discount</dt>
                      <dd className="tabular-nums">
                        {formatMoney(summary.discountTotal, proposal.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Taxable</dt>
                      <dd className="tabular-nums">
                        {formatMoney(summary.taxableAmount, proposal.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">GST total</dt>
                      <dd className="tabular-nums">{formatMoney(summary.taxTotal, proposal.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                      <dt>Grand total</dt>
                      <dd className="tabular-nums">
                        {formatMoney(proposal.grandTotal, proposal.currency)}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </section>
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {proposal?.status === 'DRAFT' && onEdit ? (
            <Button type="button" onClick={() => onEdit(proposal.id)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit draft
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
