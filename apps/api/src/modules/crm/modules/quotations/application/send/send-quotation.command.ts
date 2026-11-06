import type { CrmActor } from '../../../../shared/application/crm-actor.js';

export interface SendQuotationCommand {
  readonly actor: CrmActor;
  readonly quotationId: string;
  readonly to: readonly string[];
  readonly cc?: readonly string[];
  readonly bcc?: readonly string[];
  readonly subject: string;
  readonly bodyText: string;
}
