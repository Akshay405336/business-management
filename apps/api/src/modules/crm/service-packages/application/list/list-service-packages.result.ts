import type { ServicePackageReadModel } from '../../domain/types/service-package-read-model.js';

export interface ListServicePackagesResult {
  readonly packages: readonly ServicePackageReadModel[];
}
