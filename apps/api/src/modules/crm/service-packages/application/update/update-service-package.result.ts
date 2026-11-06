import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';

export interface UpdateServicePackageResult {
  readonly package: ServicePackageReadModel;
}
