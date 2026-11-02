import type { CrmActor } from '../shared/crm-actor.js';
import type { ProposalDocumentType } from '../../domain/crm-types.js';

export type PreviewProposalDocumentNumberQuery = {
  readonly actor: CrmActor;
  readonly type: ProposalDocumentType;
};
