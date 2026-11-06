import type { ServicePackageReadModel } from '../types/service-package-read-model.js';
import type {
  ChangeServicePackageStatusData,
  CreateServicePackageData,
  ServicePackageAuditEntry,
  UpdateServicePackageData,
} from '../types/service-package.types.js';

export const SERVICE_PACKAGE_REPOSITORY = Symbol('SERVICE_PACKAGE_REPOSITORY');

export interface ServicePackageRepository {
  list(organizationId: string): Promise<readonly ServicePackageReadModel[]>;
  findById(organizationId: string, packageId: string): Promise<ServicePackageReadModel | null>;
  previewCode(organizationId: string): Promise<string>;
  create(
    organizationId: string,
    input: CreateServicePackageData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel>;
  update(
    organizationId: string,
    packageId: string,
    input: UpdateServicePackageData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel>;
  changeStatus(
    organizationId: string,
    packageId: string,
    input: ChangeServicePackageStatusData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel>;
  delete(
    organizationId: string,
    packageId: string,
    audit: ServicePackageAuditEntry,
  ): Promise<void>;
}
