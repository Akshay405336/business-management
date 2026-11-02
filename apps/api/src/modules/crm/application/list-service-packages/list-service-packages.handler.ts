import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ServicePackageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ListServicePackagesQuery } from './list-service-packages.query.js';

@Injectable()
export class ListServicePackagesHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(query: ListServicePackagesQuery): Promise<readonly ServicePackageRecord[]> {
    return this.crm.listServicePackages(query.actor.organizationId);
  }
}
