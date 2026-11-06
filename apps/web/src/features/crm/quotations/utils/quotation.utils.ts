import type { QuotationStatus } from '../types/quotation.types';

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelQuotationStatus = (status: QuotationStatus): string => titleCase(status);

/** Active workflow statuses exposed in the current CRM quotations UI. */
export const QUOTATION_WORKFLOW_STATUSES = ['DRAFT', 'SENT', 'EXPIRED'] as const satisfies readonly QuotationStatus[];

export type QuotationWorkflowStatus = (typeof QUOTATION_WORKFLOW_STATUSES)[number];

export const isQuotationWorkflowStatus = (status: QuotationStatus): status is QuotationWorkflowStatus =>
  (QUOTATION_WORKFLOW_STATUSES as readonly QuotationStatus[]).includes(status);

export const canSendQuotation = (status: QuotationStatus): boolean =>
  status === 'DRAFT' || status === 'SENT';
