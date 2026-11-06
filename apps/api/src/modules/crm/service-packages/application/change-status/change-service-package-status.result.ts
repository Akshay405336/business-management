import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';

export interface ChangeServicePackageStatusResult {
  readonly package: ServicePackageReadModel;
}
