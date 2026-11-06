import type { ServicePackageStatus } from '../enums/service-package-status.enum.js';
import { ServicePackageStatusPolicy } from '../policies/service-package-status.policy.js';
import { ServicePackageCreationPolicy } from '../policies/service-package-creation.policy.js';
import { ServicePackageUpdatePolicy } from '../policies/service-package-update.policy.js';
import type { ServicePackageReadModel } from '../types/service-package-read-model.js';
import type {
  CreateServicePackageData,
  ServicePackageWriteInput,
} from '../types/service-package.types.js';

export class ServicePackage {
  private constructor(private readonly snapshot: ServicePackageReadModel) {}

  static reconstitute(readModel: ServicePackageReadModel): ServicePackage {
    return new ServicePackage(readModel);
  }

  static validateCreate(input: CreateServicePackageData): CreateServicePackageData {
    return ServicePackageCreationPolicy.validate(input);
  }

  static validateUpdate(input: ServicePackageWriteInput): ServicePackageWriteInput {
    return ServicePackageUpdatePolicy.validate(input);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get organizationId(): string {
    return this.snapshot.organizationId;
  }

  get status(): ServicePackageStatus {
    return this.snapshot.status;
  }

  toReadModel(): ServicePackageReadModel {
    return this.snapshot;
  }

  withStatus(next: ServicePackageStatus): ServicePackage {
    ServicePackageStatusPolicy.assertTransition(this.snapshot.status, next);
    return new ServicePackage({ ...this.snapshot, status: next });
  }
}
