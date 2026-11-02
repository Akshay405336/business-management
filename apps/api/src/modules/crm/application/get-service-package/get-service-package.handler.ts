import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ServicePackageRecord,
} from '../../domain/repositories/crm.repository.js';
import { requireCrmEntity } from '../shared/require-crm-entity.js';
import type { GetServicePackageQuery } from './get-service-package.query.js';

@Injectable()
export class GetServicePackageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: GetServicePackageQuery): Promise<ServicePackageRecord> {
    const { actor, packageId } = query;
    return requireCrmEntity(
      this.crm.getServicePackage(actor.organizationId, packageId),
      'Service package',
    );
  }
}
