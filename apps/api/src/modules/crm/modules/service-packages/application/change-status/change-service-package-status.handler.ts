import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import { servicePackageAudit } from '../shared/service-package-audit.js';
import type { ChangeServicePackageStatusCommand } from './change-service-package-status.command.js';
import type { ChangeServicePackageStatusResult } from './change-service-package-status.result.js';

@Injectable()
export class ChangeServicePackageStatusHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(
    command: ChangeServicePackageStatusCommand,
  ): Promise<ChangeServicePackageStatusResult> {
    const { actor, packageId, input } = command;
    const pkg = await this.packages.changeStatus(
      actor.organizationId,
      packageId,
      input,
      servicePackageAudit(actor, 'SERVICE_PACKAGE_UPDATED', packageId),
    );
    return { package: pkg };
  }
}
