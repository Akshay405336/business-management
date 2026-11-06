import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import { servicePackageAudit } from '../shared/service-package-audit.js';
import type { UpdateServicePackageCommand } from './update-service-package.command.js';
import type { UpdateServicePackageResult } from './update-service-package.result.js';

@Injectable()
export class UpdateServicePackageHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(command: UpdateServicePackageCommand): Promise<UpdateServicePackageResult> {
    const { actor, packageId, input } = command;
    const pkg = await this.packages.update(
      actor.organizationId,
      packageId,
      input,
      servicePackageAudit(actor, 'SERVICE_PACKAGE_UPDATED', packageId),
    );
    return { package: pkg };
  }
}
