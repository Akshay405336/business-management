'use client';

import {
  computeQuotationLinePricing,
  computeQuotationSummaryTotals,
  quotationTaxRateFractionToPercentDisplay,
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
import { formatDateOnly, formatMoney } from '@/features/admin/crm/utils/format';
import type { CrmQuotation } from '../types/quotation.types';
import {
  QUOTATION_DETAILS_MODAL_CLASS,
  QUOTATION_MODAL_DIALOG_STYLE,
  QUOTATION_MODAL_SCROLL_CLASS,
} from './quotation-dialog-shell';

export function QuotationDetailsModal({
  open,
  quotation,
  loading,
  onOpenChange,
  onEdit,
}: {
  open: boolean;
  quotation: CrmQuotation | null;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
}) {
  const summary = quotation
    ? computeQuotationSummaryTotals(
        quotation.lineItems.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
        })),
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={QUOTATION_DETAILS_MODAL_CLASS}
        style={QUOTATION_MODAL_DIALOG_STYLE}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" aria-hidden="true" />
            {quotation ? quotation.documentNumber : 'Quotation details'}
          </DialogTitle>
          <DialogDescription>
            {quotation ? quotation.title : 'Loading quotation…'}
          </DialogDescription>
        </DialogHeader>
        <div className={QUOTATION_MODAL_SCROLL_CLASS}>
          {loading || !quotation ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading document…
            </div>
          ) : (
            <div className="grid gap-6">
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Quotation information</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Issue date</dt>
                    <dd>{formatDateOnly(quotation.issueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Valid until</dt>
                    <dd>
                      {quotation.expiryDate ? formatDateOnly(quotation.expiryDate) : '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Client</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs">Client name</dt>
                    <dd>{quotation.clientName}</dd>
                  </div>
                  {quotation.companyName ? (
                    <div>
                      <dt className="text-muted-foreground text-xs">Company</dt>
                      <dd>{quotation.companyName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-muted-foreground text-xs">Phone</dt>
                    <dd>{quotation.clientPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Email</dt>
                    <dd>{quotation.clientEmail}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground text-xs">Billing address</dt>
                    <dd className="whitespace-pre-wrap">{quotation.billingAddress}</dd>
                  </div>
                  {quotation.clientGstin ? (
                    <div>
                      <dt className="text-muted-foreground text-xs">GSTIN</dt>
                      <dd>{quotation.clientGstin}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {(quotation.description ||
                quotation.scopeOfWork ||
                quotation.terms ||
                quotation.notes ||
                quotation.paymentTerms ||
                quotation.deliveryTimeline) && (
                <section className="grid gap-2">
                  <h3 className="text-sm font-semibold">Description & terms</h3>
                  <dl className="grid gap-3 text-sm">
                    {quotation.description ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Overview</dt>
                        <dd className="whitespace-pre-wrap">{quotation.description}</dd>
                      </div>
                    ) : null}
                    {quotation.scopeOfWork ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Scope of work</dt>
                        <dd className="whitespace-pre-wrap">{quotation.scopeOfWork}</dd>
                      </div>
                    ) : null}
                    {quotation.paymentTerms ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Payment terms</dt>
                        <dd className="whitespace-pre-wrap">{quotation.paymentTerms}</dd>
                      </div>
                    ) : null}
                    {quotation.deliveryTimeline ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Delivery timeline</dt>
                        <dd className="whitespace-pre-wrap">{quotation.deliveryTimeline}</dd>
                      </div>
                    ) : null}
                    {quotation.terms ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Terms & conditions</dt>
                        <dd className="whitespace-pre-wrap">{quotation.terms}</dd>
                      </div>
                    ) : null}
                    {quotation.notes ? (
                      <div>
                        <dt className="text-muted-foreground text-xs">Notes</dt>
                        <dd className="whitespace-pre-wrap">{quotation.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
              )}

              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Line items</h3>
                {quotation.lineItems.length === 0 ? (
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
                        {quotation.lineItems.map((item, index) => {
                          const row = computeQuotationLinePricing({
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
                                {formatMoney(item.unitPrice, quotation.currency)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {quotationTaxRateFractionToPercentDisplay(item.taxRate)}%
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(row.lineTotal, quotation.currency)}
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
                      <dd className="tabular-nums">{formatMoney(summary.subtotal, quotation.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Discount</dt>
                      <dd className="tabular-nums">
                        {formatMoney(summary.discountTotal, quotation.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Taxable</dt>
                      <dd className="tabular-nums">
                        {formatMoney(summary.taxableAmount, quotation.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">GST total</dt>
                      <dd className="tabular-nums">{formatMoney(summary.taxTotal, quotation.currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                      <dt>Grand total</dt>
                      <dd className="tabular-nums">
                        {formatMoney(quotation.grandTotal, quotation.currency)}
                      </dd>
                    </div>
                  </dl>
                ) : null}
              </section>
            </div>
          )}
        </div>
        <DialogFooter className="border-border/60 shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {quotation?.status === 'DRAFT' && onEdit ? (
            <Button type="button" onClick={() => onEdit(quotation.id)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit quotation
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
