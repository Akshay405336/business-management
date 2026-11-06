import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import { servicePackageAudit } from '../shared/service-package-audit.js';
import type { CreateServicePackageCommand } from './create-service-package.command.js';
import type { CreateServicePackageResult } from './create-service-package.result.js';

@Injectable()
export class CreateServicePackageHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(command: CreateServicePackageCommand): Promise<CreateServicePackageResult> {
    const { actor, input } = command;
    const pkg = await this.packages.create(
      actor.organizationId,
      input,
      servicePackageAudit(actor, 'SERVICE_PACKAGE_CREATED', 'pending'),
    );
    return { package: pkg };
  }
}
