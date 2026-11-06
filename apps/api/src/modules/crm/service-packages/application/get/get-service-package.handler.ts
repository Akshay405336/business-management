import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import { requireServicePackage } from '../shared/require-service-package.js';
import type { GetServicePackageQuery } from './get-service-package.query.js';
import type { GetServicePackageResult } from './get-service-package.result.js';

@Injectable()
export class GetServicePackageHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(query: GetServicePackageQuery): Promise<GetServicePackageResult> {
    const { actor, packageId } = query;
    const pkg = await requireServicePackage(
      this.packages.findById(actor.organizationId, packageId),
    );
    return { package: pkg };
  }
}
