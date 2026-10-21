'use client';

import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getProposalPrint } from '../api/proposals';
import type { CrmProposalPrintResponse } from '../types';
import { formatDateOnly, formatMoney } from '../utils/format';
import { describeCrmError } from '../utils/errors';
import { labelProposalStatus, labelProposalType } from '../utils/labels';
import { CrmErrorAlert, CrmLoadingRows } from './crm-feedback';

export function ProposalPrintPage({ proposalId }: { proposalId: string }) {
  const [proposal, setProposal] = useState<CrmProposalPrintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await getProposalPrint(proposalId, controller.signal);
        if (!controller.signal.aborted) setProposal(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(describeCrmError(failure));
      }
    })();
    return () => controller.abort();
  }, [proposalId]);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 print:max-w-none print:gap-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-muted-foreground text-sm">Print preview</p>
        <Button type="button" size="sm" onClick={() => window.print()} disabled={!proposal}>
          <Printer aria-hidden="true" />
          Print
        </Button>
      </div>

      {error ? <CrmErrorAlert message={error} /> : null}
      {!proposal && !error ? <CrmLoadingRows rows={8} /> : null}

      {proposal ? (
        <article className="bg-card grid gap-6 rounded-lg border p-8 print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{proposal.organizationName}</p>
              <h1 className="text-2xl font-semibold">{proposal.title}</h1>
              <p className="text-muted-foreground text-sm">
                {labelProposalType(proposal.type)} · {proposal.documentNumber}
              </p>
            </div>
            <div className="text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                {labelProposalStatus(proposal.status)}
              </p>
              <p>
                <span className="text-muted-foreground">Issue date:</span>{' '}
                {formatDateOnly(proposal.issueDate)}
              </p>
              {proposal.expiryDate ? (
                <p>
                  <span className="text-muted-foreground">Valid until:</span>{' '}
                  {formatDateOnly(proposal.expiryDate)}
                </p>
              ) : null}
            </div>
          </header>

          {proposal.description ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Summary</h2>
              <p className="text-sm whitespace-pre-wrap">{proposal.description}</p>
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
                {proposal.lineItems.map((item) => (
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
                      {formatMoney(item.unitPrice, proposal.currency)}
                    </td>
                    <td className="py-2 text-right align-top">
                      {formatMoney(item.lineTotal, proposal.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="ml-auto grid w-full max-w-xs gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(proposal.subtotal, proposal.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>{formatMoney(proposal.discountTotal, proposal.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(proposal.taxTotal, proposal.currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand total</span>
              <span>{formatMoney(proposal.grandTotal, proposal.currency)}</span>
            </div>
          </section>

          {proposal.notes ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{proposal.notes}</p>
            </section>
          ) : null}

          {proposal.terms ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide uppercase">Terms</h2>
              <p className="text-sm whitespace-pre-wrap">{proposal.terms}</p>
            </section>
          ) : null}

          <footer className="text-muted-foreground border-t pt-4 text-xs print:fixed print:bottom-0 print:w-full">
            Generated {new Date().toLocaleString()} · Version {proposal.version}
          </footer>
        </article>
      ) : null}
    </div>
  );
}
