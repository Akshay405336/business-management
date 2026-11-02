import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ServicePackageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { ChangeServicePackageStatusCommand } from './change-service-package-status.command.js';

@Injectable()
export class ChangeServicePackageStatusHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: ChangeServicePackageStatusCommand): Promise<ServicePackageRecord> {
    const { actor, packageId, input } = command;
    return this.crm.changeServicePackageStatus(actor.organizationId, packageId, input, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }
}
