import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { QuotationPrintReadModel } from '../../domain/types/quotation-read-model.js';
import { toUtcDateOnlyString } from '../../domain/utils/quotation-date.utils.js';

const money = (value: string, currency: string): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

@Injectable()
export class QuotationPdfService {
  render(print: QuotationPrintReadModel): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const typeLabel = print.type === 'QUOTATION' ? 'Quotation' : 'Proposal';
      doc.fontSize(18).text(print.organizationName, { continued: false });
      doc.moveDown(0.25);
      doc.fontSize(22).text(print.title);
      doc.fontSize(11).fillColor('#444444');
      doc.text(`${typeLabel} · ${print.documentNumber}`);
      doc.text(`Issue date: ${toUtcDateOnlyString(print.issueDate)}`);
      if (print.expiryDate) {
        doc.text(`Valid until: ${toUtcDateOnlyString(print.expiryDate)}`);
      }
      doc.moveDown();
      doc.fillColor('#000000');

      doc.fontSize(12).text('Bill to', { underline: true });
      doc.fontSize(11);
      doc.text(print.clientName);
      if (print.companyName.trim()) doc.text(print.companyName);
      if (print.clientEmail.trim()) doc.text(print.clientEmail);
      if (print.clientPhone.trim()) doc.text(print.clientPhone);
      if (print.billingAddress.trim()) doc.text(print.billingAddress);
      doc.moveDown();

      if (print.description.trim()) {
        doc.fontSize(12).text('Summary', { underline: true });
        doc.fontSize(10).text(print.description, { align: 'left' });
        doc.moveDown();
      }

      doc.fontSize(12).text('Line items', { underline: true });
      doc.moveDown(0.35);
      const tableTop = doc.y;
      const colName = 48;
      const colQty = 300;
      const colUnit = 360;
      const colTotal = 470;
      doc.fontSize(9).fillColor('#333333');
      doc.text('Item', colName, tableTop);
      doc.text('Qty', colQty, tableTop);
      doc.text('Unit', colUnit, tableTop);
      doc.text('Total', colTotal, tableTop, { width: 90, align: 'right' });
      doc.moveDown(0.5);
      doc.strokeColor('#cccccc').moveTo(48, doc.y).lineTo(547, doc.y).stroke();
      doc.moveDown(0.35);
      doc.fillColor('#000000');

      for (const item of print.lineItems ?? []) {
        if (doc.y > 700) {
          doc.addPage();
        }
        const rowY = doc.y;
        doc.fontSize(9).text(item.name, colName, rowY, { width: 240 });
        doc.text(item.quantity, colQty, rowY);
        doc.text(money(item.unitPrice, print.currency), colUnit, rowY, { width: 90 });
        doc.text(money(item.lineTotal, print.currency), colTotal, rowY, {
          width: 90,
          align: 'right',
        });
        doc.moveDown(0.15);
        if (item.description.trim()) {
          doc.fontSize(8).fillColor('#555555').text(item.description, colName, doc.y, { width: 420 });
          doc.fillColor('#000000');
        }
        doc.moveDown(0.45);
      }

      doc.moveDown();
      const totalsX = 360;
      doc.fontSize(10);
      doc.text(`Subtotal: ${money(print.subtotal, print.currency)}`, totalsX, doc.y, {
        align: 'right',
        width: 180,
      });
      doc.text(`Discount: ${money(print.discountTotal, print.currency)}`, totalsX, doc.y, {
        align: 'right',
        width: 180,
      });
      doc.text(`Tax: ${money(print.taxTotal, print.currency)}`, totalsX, doc.y, {
        align: 'right',
        width: 180,
      });
      doc.fontSize(12).text(`Total: ${money(print.grandTotal, print.currency)}`, totalsX, doc.y, {
        align: 'right',
        width: 180,
      });
      doc.moveDown();

      if (print.notes.trim()) {
        doc.fontSize(11).text('Notes', { underline: true });
        doc.fontSize(10).text(print.notes);
        doc.moveDown();
      }
      if (print.terms.trim()) {
        doc.fontSize(11).text('Terms and conditions', { underline: true });
        doc.fontSize(10).text(print.terms);
        doc.moveDown();
      }
      if (print.paymentTerms.trim()) {
        doc.fontSize(11).text('Payment terms', { underline: true });
        doc.fontSize(10).text(print.paymentTerms);
      }

      doc.end();
    });
  }

  filename(documentNumber: string): string {
    const safe = documentNumber.replace(/[^\w.-]+/g, '_');
    return `${safe}.pdf`;
  }
}
