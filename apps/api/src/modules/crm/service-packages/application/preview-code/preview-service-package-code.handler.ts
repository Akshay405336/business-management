import { Inject, Injectable } from '@nestjs/common';
import {
  SERVICE_PACKAGE_REPOSITORY,
  type ServicePackageRepository,
} from '../../domain/repositories/service-package.repository.js';
import type { PreviewServicePackageCodeQuery } from './preview-service-package-code.query.js';
import type { PreviewServicePackageCodeResult } from './preview-service-package-code.result.js';

@Injectable()
export class PreviewServicePackageCodeHandler {
  constructor(
    @Inject(SERVICE_PACKAGE_REPOSITORY) private readonly packages: ServicePackageRepository,
  ) {}

  async execute(query: PreviewServicePackageCodeQuery): Promise<PreviewServicePackageCodeResult> {
    const code = await this.packages.previewCode(query.actor.organizationId);
    return { code };
  }
}
