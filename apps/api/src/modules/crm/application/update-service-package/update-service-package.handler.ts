import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ServicePackageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { UpdateServicePackageCommand } from './update-service-package.command.js';

@Injectable()
export class UpdateServicePackageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: UpdateServicePackageCommand): Promise<ServicePackageRecord> {
    const { actor, packageId, input } = command;
    return this.crm.updateServicePackage(actor.organizationId, packageId, input, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }
}
