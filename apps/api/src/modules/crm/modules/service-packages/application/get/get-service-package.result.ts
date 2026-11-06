import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';

export interface GetServicePackageResult {
  readonly package: ServicePackageReadModel;
}
