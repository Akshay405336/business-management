import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { CreateQuotationData } from '../../domain/types/quotation.types.js';

export interface CreateQuotationCommand {
  readonly actor: CrmActor;
  readonly input: Omit<CreateQuotationData, 'createdByAdminId'>;
}
