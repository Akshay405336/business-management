import { Inject, Injectable } from '@nestjs/common';
import {
  CRM_REPOSITORY,
  type CrmRepository,
  type ServicePackageRecord,
} from '../../domain/repositories/crm.repository.js';
import type { CreateServicePackageCommand } from './create-service-package.command.js';

@Injectable()
export class CreateServicePackageHandler {
  constructor(@Inject(CRM_REPOSITORY) private readonly crm: CrmRepository) {}

  execute(command: CreateServicePackageCommand): Promise<ServicePackageRecord> {
    const { actor, input } = command;
    return this.crm.createServicePackage(actor.organizationId, input, {
      type: 'SERVICE_PACKAGE_CREATED',
      adminId: actor.adminId,
      entityType: 'service_package',
      entityId: 'pending',
    });
  }
}
