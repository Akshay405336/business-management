import { QuotationValidationError } from '../errors/quotation.errors.js';
import type { QuotationStatus } from '../enums/quotation-status.enum.js';

/** Manual status changes from the API (not send / automated expiry). */
const MANUAL_ALLOWED: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ['CANCELLED'],
  SENT: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

const AUTOMATED_ALLOWED: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ['EXPIRED'],
  SENT: ['EXPIRED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

const SEND_ALLOWED: Record<QuotationStatus, readonly QuotationStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['SENT'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export class QuotationStatusPolicy {
  static assertManualTransition(from: QuotationStatus, to: QuotationStatus): void {
    if (!MANUAL_ALLOWED[from].includes(to)) {
      throw new QuotationValidationError(`Cannot change quotation status from ${from} to ${to}.`);
    }
  }

  static assertAutomatedExpiration(from: QuotationStatus, to: QuotationStatus): void {
    if (to !== 'EXPIRED' || !AUTOMATED_ALLOWED[from].includes(to)) {
      throw new QuotationValidationError(`Cannot expire quotation from status ${from}.`);
    }
  }

  static assertSendTransition(from: QuotationStatus, to: QuotationStatus): void {
    if (!SEND_ALLOWED[from].includes(to)) {
      throw new QuotationValidationError(`Cannot mark quotation sent from status ${from}.`);
    }
  }

  /** @deprecated Use assertManualTransition, assertSendTransition, or assertAutomatedExpiration */
  static assertTransition(from: QuotationStatus, to: QuotationStatus): void {
    this.assertManualTransition(from, to);
  }
}

/** @deprecated Prefer QuotationStatusPolicy.assertTransition */
export function assertQuotationStatusTransition(from: QuotationStatus, to: QuotationStatus): void {
  QuotationStatusPolicy.assertTransition(from, to);
}
