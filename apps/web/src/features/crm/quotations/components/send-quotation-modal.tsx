'use client';

import { Download, Loader2, Mail, Printer } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminToast } from '@/features/admin/components/toast';
import { CrmErrorAlert, CrmFormField } from '@/features/admin/crm/components/crm-feedback';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { formatDateOnly } from '@/features/admin/crm/utils/format';
import { getQuotationPdfBlob, getQuotationPrint, sendQuotation } from '../api/quotations.api';
import type { CrmQuotation, CrmQuotationPrintResponse } from '../types/quotation.types';
import { canSendQuotation } from '../utils/quotation.utils';
import {
  QUOTATION_FORM_PRIMARY_BTN,
  QUOTATION_FORM_SECONDARY_BTN,
  QUOTATION_SEND_MODAL_DIALOG_CLASS,
  QUOTATION_SEND_MODAL_DIALOG_STYLE,
  QUOTATION_SEND_MODAL_EMAIL_PANE_CLASS,
  QUOTATION_SEND_MODAL_PREVIEW_FRAME_CLASS,
  QUOTATION_SEND_MODAL_PREVIEW_PANE_CLASS,
  QUOTATION_SEND_MODAL_SPLIT_CLASS,
} from './quotation-dialog-shell';

type SendFormState = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  bodyText: string;
};

type SendModalCacheEntry = {
  readonly print: CrmQuotationPrintResponse;
  readonly pdfBlob: Blob;
};

/** In-memory cache for the current session (reuse on modal reopen; cleared after send). */
const sendModalCache = new Map<string, SendModalCacheEntry>();

export function invalidateSendQuotationModalCache(quotationId?: string): void {
  if (quotationId) {
    sendModalCache.delete(quotationId);
    return;
  }
  sendModalCache.clear();
}

const parseRecipientField = (value: string): string[] =>
  value
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const buildDefaultSubject = (quotation: CrmQuotation): string =>
  `Quotation ${quotation.documentNumber} - ${quotation.title}`;

const buildDefaultBody = (quotation: CrmQuotation, organizationName: string): string => {
  const clientName = quotation.clientName.trim() || 'Customer';
  const validUntil = quotation.expiryDate
    ? formatDateOnly(quotation.expiryDate)
    : 'the date shown in the document';
  return [
    `Dear ${clientName},`,
    '',
    `Please find attached our quotation ${quotation.documentNumber} for ${quotation.title}.`,
    '',
    `The quotation is valid until ${validUntil}.`,
    '',
    'Please review the attached document and contact us if you have any questions.',
    '',
    'Regards,',
    organizationName.trim() || 'Our team',
  ].join('\n');
};

/**
 * Chrome/Edge built-in PDF viewer — minimal chrome: no sidebar/toolbars, fit page width.
 * @see https://www.adobe.com/content/dam/acom/en/devnet/acrobat/pdfs/pdf_open_parameters.pdf
 */
const pdfIframePreviewSrc = (blobUrl: string): string =>
  `${blobUrl}#toolbar=0&navpanes=0&statusbar=0&pagemode=none&zoom=page-width`;

const quotationPdfFileName = (documentNumber: string): string =>
  `${documentNumber.replace(/[^\w.-]+/g, '_')}.pdf`;

const defaultFormFromPrint = (print: CrmQuotationPrintResponse): SendFormState => ({
  to: print.clientEmail.trim(),
  cc: '',
  bcc: '',
  subject: buildDefaultSubject(print),
  bodyText: buildDefaultBody(print, print.organizationName),
});

export function SendQuotationModal({
  open,
  quotationId,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  quotationId: string | null;
  onOpenChange: (open: boolean) => void;
  onSent: () => void | Promise<void>;
}) {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotation, setQuotation] = useState<CrmQuotation | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [form, setForm] = useState<SendFormState>(() => ({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    bodyText: '',
  }));

  const pdfObjectUrlRef = useRef<string | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);

  const revokePdfObjectUrl = () => {
    const url = pdfObjectUrlRef.current;
    if (url) {
      URL.revokeObjectURL(url);
      pdfObjectUrlRef.current = null;
    }
    pdfBlobRef.current = null;
    setPdfUrl(null);
  };

  useEffect(() => {
    if (!open || !quotationId) {
      revokePdfObjectUrl();
      setQuotation(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);
    revokePdfObjectUrl();
    setQuotation(null);

    void (async () => {
      try {
        const cached = sendModalCache.get(quotationId);
        const printPromise = cached
          ? Promise.resolve(cached.print)
          : getQuotationPrint(quotationId, controller.signal);
        const pdfPromise = cached
          ? Promise.resolve(cached.pdfBlob)
          : getQuotationPdfBlob(quotationId, controller.signal);

        const [print, pdfBlob] = await Promise.all([printPromise, pdfPromise]);
        if (cancelled || controller.signal.aborted) return;

        if (!cached) {
          sendModalCache.set(quotationId, { print, pdfBlob });
        }

        const objectUrl = URL.createObjectURL(pdfBlob);
        pdfObjectUrlRef.current = objectUrl;
        pdfBlobRef.current = pdfBlob;
        setQuotation(print);
        setForm(defaultFormFromPrint(print));
        setPdfUrl(objectUrl);
      } catch (failure) {
        if (!cancelled && !controller.signal.aborted) {
          setError(describeCrmError(failure));
        }
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      revokePdfObjectUrl();
    };
  }, [open, quotationId]);

  const sendAllowed = quotation ? canSendQuotation(quotation.status) : false;

  const submitDisabled = useMemo(
    () => loading || sending || !sendAllowed || !quotationId,
    [loading, quotationId, sendAllowed, sending],
  );

  const handleDownloadPdf = () => {
    const blob = pdfBlobRef.current;
    if (!blob || !quotation) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = quotationPdfFileName(quotation.documentNumber);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    if (!pdfUrl) return;
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    printFrame.src = pdfUrl;
    document.body.appendChild(printFrame);
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } finally {
        window.setTimeout(() => printFrame.remove(), 2000);
      }
    };
  };

  const handleSend = async () => {
    if (!quotationId || !quotation) return;
    const to = parseRecipientField(form.to);
    if (to.length === 0) {
      toast.error('Enter at least one recipient in the To field.');
      return;
    }
    setSending(true);
    try {
      await sendQuotation(quotationId, {
        to,
        cc: parseRecipientField(form.cc),
        bcc: parseRecipientField(form.bcc),
        subject: form.subject,
        bodyText: form.bodyText,
      });
      invalidateSendQuotationModalCache(quotationId);
      toast.success(`Quotation "${quotation.documentNumber}" sent.`);
      onOpenChange(false);
      await onSent();
    } catch (failure) {
      toast.error(describeCrmError(failure));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={QUOTATION_SEND_MODAL_DIALOG_CLASS}
        style={QUOTATION_SEND_MODAL_DIALOG_STYLE}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-border/60 w-full shrink-0 space-y-1 border-b px-6 pt-6 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" aria-hidden="true" />
            Send Quotation
          </DialogTitle>
          <DialogDescription>
            {quotation
              ? `${quotation.documentNumber} · ${quotation.title}`
              : 'Review the PDF and compose your email.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[min(520px,60vh)] w-full flex-1 flex-col overflow-hidden">
          {error ? (
            <div className="shrink-0 px-6 pt-3">
              <CrmErrorAlert message={error} />
            </div>
          ) : null}
          {loading ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 px-6 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading quotation…
            </div>
          ) : null}

          {!loading && quotation ? (
            <div className={QUOTATION_SEND_MODAL_SPLIT_CLASS}>
              <aside className={QUOTATION_SEND_MODAL_PREVIEW_PANE_CLASS} aria-label="Quotation PDF preview">
                <div className="flex shrink-0 items-center justify-between gap-2">
                  <h3 className="text-foreground text-sm font-semibold tracking-tight">PDF preview</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      disabled={!pdfUrl}
                      onClick={handleDownloadPdf}
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-2.5 text-xs"
                      disabled={!pdfUrl}
                      onClick={handlePrintPdf}
                    >
                      <Printer className="size-3.5" aria-hidden="true" />
                      Print
                    </Button>
                  </div>
                </div>
                <div className={QUOTATION_SEND_MODAL_PREVIEW_FRAME_CLASS}>
                  {pdfUrl ? (
                    <iframe
                      title={`Quotation ${quotation.documentNumber} PDF`}
                      src={pdfIframePreviewSrc(pdfUrl)}
                      className="absolute inset-0 h-full min-h-[420px] w-full border-0"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full min-h-[420px] items-center justify-center text-sm">
                      PDF preview unavailable.
                    </div>
                  )}
                </div>
              </aside>

              <section
                className={QUOTATION_SEND_MODAL_EMAIL_PANE_CLASS}
                aria-label="Email details"
              >
                <h3 className="text-foreground shrink-0 text-sm font-semibold tracking-tight">
                  Email
                </h3>
                <div className="flex w-full min-w-0 max-w-none flex-col gap-4">
                <CrmFormField id="send-to" label="To" required className="w-full">
                  <Input
                    id="send-to"
                    value={form.to}
                    placeholder="client@example.com, billing@example.com"
                    onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
                  />
                  <p className="text-muted-foreground text-xs">Separate multiple addresses with commas.</p>
                </CrmFormField>
                <CrmFormField id="send-cc" label="CC">
                  <Input
                    id="send-cc"
                    value={form.cc}
                    onChange={(event) => setForm((current) => ({ ...current, cc: event.target.value }))}
                  />
                </CrmFormField>
                <CrmFormField id="send-bcc" label="BCC">
                  <Input
                    id="send-bcc"
                    value={form.bcc}
                    onChange={(event) => setForm((current) => ({ ...current, bcc: event.target.value }))}
                  />
                </CrmFormField>
                <CrmFormField id="send-subject" label="Subject" required>
                  <Input
                    id="send-subject"
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subject: event.target.value }))
                    }
                  />
                </CrmFormField>
                <CrmFormField id="send-body" label="Email body" required>
                  <Textarea
                    id="send-body"
                    value={form.bodyText}
                    rows={10}
                    className="min-h-[180px] resize-y"
                    onChange={(event) =>
                      setForm((current) => ({ ...current, bodyText: event.target.value }))
                    }
                  />
                </CrmFormField>
                {!sendAllowed ? (
                  <CrmErrorAlert message="This quotation cannot be sent in its current status." />
                ) : null}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-border/60 w-full shrink-0 flex-wrap gap-2 border-t px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={QUOTATION_FORM_SECONDARY_BTN}
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={QUOTATION_FORM_PRIMARY_BTN}
            disabled={submitDisabled}
            onClick={() => void handleSend()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Send Quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
