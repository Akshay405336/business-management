import type { CrmActor } from '../../../../shared/application/crm-actor.js';
import type { QuotationDocumentType } from '../../domain/enums/quotation-status.enum.js';

export interface PreviewDocumentNumberQuery {
  readonly actor: CrmActor;
  readonly type: QuotationDocumentType;
}
