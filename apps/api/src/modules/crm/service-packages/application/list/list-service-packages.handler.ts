import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import type { ListServicePackagesQuery } from './list-service-packages.query.js';
import type { ListServicePackagesResult } from './list-service-packages.result.js';

@Injectable()
export class ListServicePackagesHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(query: ListServicePackagesQuery): Promise<ListServicePackagesResult> {
    const packages = await this.packages.list(query.actor.organizationId);
    return { packages };
  }
}
