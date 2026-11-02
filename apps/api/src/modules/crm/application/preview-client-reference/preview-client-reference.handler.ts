import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { PreviewClientReferenceQuery } from './preview-client-reference.query.js';

@Injectable()
export class PreviewClientReferenceHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: PreviewClientReferenceQuery): Promise<string> {
    return this.crm.previewClientReference(query.actor.organizationId);
  }
}
