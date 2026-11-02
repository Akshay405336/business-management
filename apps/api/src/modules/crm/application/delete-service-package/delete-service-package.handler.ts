import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
} from '../../domain/repositories/crm.repository.js';
import type { DeleteServicePackageCommand } from './delete-service-package.command.js';

@Injectable()
export class DeleteServicePackageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: DeleteServicePackageCommand): Promise<void> {
    const { actor, packageId } = command;
    return this.crm.deleteServicePackage(actor.organizationId, packageId, {
      type: 'SERVICE_PACKAGE_UPDATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: packageId,
    });
  }
}
