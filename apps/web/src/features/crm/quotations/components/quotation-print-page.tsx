'use client';

import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getQuotationPrint } from '../api/quotations.api';
import type { CrmQuotationPrintResponse } from '../types/quotation.types';
import { formatDateOnly, formatMoney } from '@/features/admin/crm/utils/format';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { packageSnapshotSections } from '@/features/admin/crm/utils/package-snapshot-labels';
import { CrmErrorAlert, CrmLoadingRows } from '@/features/admin/crm/components/crm-feedback';
import { labelQuotationStatus } from '../utils/quotation.utils';

export function QuotationPrintPage({ quotationId }: { quotationId: string }) {
  const [quotation, setQuotation] = useState<CrmQuotationPrintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await getQuotationPrint(quotationId, controller.signal);
        if (!controller.signal.aborted) setQuotation(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [quotationId]);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 print:max-w-none print:gap-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-muted-foreground text-sm">Print preview</p>
        <Button type="button" size="sm" onClick={() => window.print()} disabled={!quotation}>
          <Printer aria-hidden="true" />
          Print
        </Button>
      </div>

      {error ? <CrmErrorAlert message={error} /> : null}
      {!quotation && !error ? <CrmLoadingRows rows={8} /> : null}

      {quotation ? (
        <article className="bg-card grid gap-6 rounded-lg border p-8 print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{quotation.organizationName}</p>
              <h1 className="text-2xl font-semibold">{quotation.title}</h1>
              <p className="text-muted-foreground text-sm">
                {quotation.type === 'QUOTATION' ? 'Quotation' : 'Proposal'} · {quotation.documentNumber}
              </p>
            </div>
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                {labelQuotationStatus(quotation.status)}
              </p>
              <p>
                <span className="text-muted-foreground">Issue date:</span>{' '}
                {formatDateOnly(quotation.issueDate)}
              </p>
              {quotation.expiryDate ? (
                <p>
                  <span className="text-muted-foreground">Valid until:</span>{' '}
                  {formatDateOnly(quotation.expiryDate)}
                </p>
              ) : null}
            </div>
          </header>

          {quotation.description ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Summary</h2>
              <p className="text-sm whitespace-pre-wrap">{quotation.description}</p>
            </section>
          ) : null}

          {quotation.packageSnapshot ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">
                Package scope (snapshot)
              </h2>
              <p className="text-muted-foreground mb-3 text-xs">
                {quotation.packageSnapshot.name} ({quotation.packageSnapshot.code}) · captured{' '}
                {formatDateOnly(quotation.packageSnapshot.snapshotAt.slice(0, 10))}
              </p>
              <dl className="grid gap-2 text-sm">
                {packageSnapshotSections(quotation.packageSnapshot).map((section) => (
                  <div key={section.title}>
                    <dt className="text-muted-foreground text-xs font-medium uppercase">
                      {section.title}
                    </dt>
                    <dd className="whitespace-pre-wrap">{section.value}</dd>
                  </div>
                ))}
              </dl>
              {quotation.packageSnapshot.integrationNotes ? (
                <p className="text-muted-foreground mt-3 text-xs whitespace-pre-wrap">
                  Integration notes: {quotation.packageSnapshot.integrationNotes}
                </p>
              ) : null}
              <p className="text-muted-foreground mt-2 text-xs">
                Catalog selections document intended scope only; third-party accounts and credentials
                are not included unless stated in notes or terms.
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Line items</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 font-medium">Qty</th>
                  <th className="py-2 pr-2 font-medium">Unit price</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-dashed">
                    <td className="py-2 pr-2 align-top">
                      <p className="font-medium">{item.name}</p>
                      {item.description ? (
                        <p className="text-muted-foreground text-xs">{item.description}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2 pr-2 align-top">
                      {formatMoney(item.unitPrice, quotation.currency)}
                    </td>
                    <td className="py-2 text-right align-top">
                      {formatMoney(item.lineTotal, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="ml-auto grid w-full max-w-xs gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(quotation.subtotal, quotation.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>{formatMoney(quotation.discountTotal, quotation.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(quotation.taxTotal, quotation.currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand total</span>
              <span>{formatMoney(quotation.grandTotal, quotation.currency)}</span>
            </div>
          </section>

          {quotation.notes ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
            </section>
          ) : null}

          {quotation.terms ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Terms</h2>
              <p className="text-sm whitespace-pre-wrap">{quotation.terms}</p>
            </section>
          ) : null}

          <footer className="text-muted-foreground border-t pt-4 text-xs print:fixed print:bottom-0 print:w-full">
            Generated {new Date().toLocaleString()} · Version {quotation.version}
          </footer>
        </article>
      ) : null}
    </div>
  );
}
