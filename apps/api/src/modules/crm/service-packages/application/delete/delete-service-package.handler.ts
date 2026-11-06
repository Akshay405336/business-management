import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import { servicePackageAudit } from '../shared/service-package-audit.js';
import type { DeleteServicePackageCommand } from './delete-service-package.command.js';
import type { DeleteServicePackageResult } from './delete-service-package.result.js';

@Injectable()
export class DeleteServicePackageHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(command: DeleteServicePackageCommand): Promise<DeleteServicePackageResult> {
    const { actor, packageId } = command;
    await this.packages.delete(
      actor.organizationId,
      packageId,
      servicePackageAudit(actor, 'SERVICE_PACKAGE_DELETED', packageId),
    );
    return { packageId };
  }
}
