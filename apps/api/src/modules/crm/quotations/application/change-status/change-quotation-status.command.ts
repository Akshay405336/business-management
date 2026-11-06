import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { QuotationStatus } from '../../domain/enums/quotation-status.enum.js';

export interface ChangeQuotationStatusCommand {
  readonly actor: CrmActor;
  readonly quotationId: string;
  readonly toStatus: QuotationStatus;
  readonly note?: string;
}
