import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { PreviewServicePackageCodeQuery } from './preview-service-package-code.query.js';

@Injectable()
export class PreviewServicePackageCodeHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: PreviewServicePackageCodeQuery): Promise<string> {
    return this.crm.previewServicePackageCode(query.actor.organizationId);
  }
}
