import type { CrmActor } from '../../../application/shared/crm-actor.js';
import type { UpdateQuotationData } from '../../domain/types/quotation.types.js';

export interface UpdateQuotationCommand {
  readonly actor: CrmActor;
  readonly quotationId: string;
  readonly input: UpdateQuotationData;
}
