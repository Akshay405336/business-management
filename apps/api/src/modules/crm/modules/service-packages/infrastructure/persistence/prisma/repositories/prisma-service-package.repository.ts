import { Inject, Injectable } from '@nestjs/common';
import { CRM_REPOSITORY } from '../../../../../../shared/domain/repositories/crm.repository.js';
import type { CrmPersistenceHost } from '../../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { writeAudit } from '../../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { ServicePackage } from '../../../../domain/entities/service-package.entity.js';
import { ServicePackageNotFoundError } from '../../../../domain/errors/service-package.errors.js';
import type { ServicePackageRepository } from '../../../../domain/repositories/service-package.repository.js';
import type { ServicePackageReadModel } from '../../../../domain/types/service-package-read-model.js';
import type {
  ChangeServicePackageStatusData,
  CreateServicePackageData,
  ServicePackageAuditEntry,
  UpdateServicePackageData,
} from '../../../../domain/types/service-package.types.js';
import {
  changeServicePackageStatus as changeStatusRow,
  createServicePackage as createRow,
  deleteServicePackage as deleteRow,
  getServicePackage as getRow,
  listServicePackages as listRows,
  nextServicePackageCode,
  previewServicePackageCode as previewCodeRow,
  updateServicePackage as updateRow,
} from '../service-package-prisma.store.js';

@Injectable()
export class PrismaServicePackageRepository implements ServicePackageRepository {
  constructor(@Inject(CRM_REPOSITORY) private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  list(organizationId: string): Promise<readonly ServicePackageReadModel[]> {
    return listRows(this.prisma, organizationId);
  }

  findById(organizationId: string, packageId: string): Promise<ServicePackageReadModel | null> {
    return getRow(this.prisma, organizationId, packageId);
  }

  previewCode(organizationId: string): Promise<string> {
    return previewCodeRow(this.prisma, organizationId);
  }

  async create(
    organizationId: string,
    input: CreateServicePackageData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel> {
    ServicePackage.validateCreate(input);
    return this.prisma.$transaction(async (tx) => {
      const code = await nextServicePackageCode(tx, organizationId);
      const created = await createRow(tx, organizationId, input, code);
      await writeAudit(tx, organizationId, { ...audit, entityId: created.id });
      return created;
    });
  }

  async update(
    organizationId: string,
    packageId: string,
    input: UpdateServicePackageData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel> {
    ServicePackage.validateUpdate(input);
    return this.prisma.$transaction(async (tx) => {
      const updated = await updateRow(tx, organizationId, packageId, input);
      await writeAudit(tx, organizationId, { ...audit, entityId: updated.id });
      return updated;
    });
  }

  async changeStatus(
    organizationId: string,
    packageId: string,
    input: ChangeServicePackageStatusData,
    audit: ServicePackageAuditEntry,
  ): Promise<ServicePackageReadModel> {
    const existing = await this.findById(organizationId, packageId);
    if (!existing) throw new ServicePackageNotFoundError('Service package');
    ServicePackage.reconstitute(existing).withStatus(input.status);
    return this.prisma.$transaction(async (tx) => {
      const updated = await changeStatusRow(tx, organizationId, packageId, input.status);
      await writeAudit(tx, organizationId, { ...audit, entityId: updated.id });
      return updated;
    });
  }

  async delete(
    organizationId: string,
    packageId: string,
    audit: ServicePackageAuditEntry,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await deleteRow(tx, organizationId, packageId);
      await writeAudit(tx, organizationId, audit);
    });
  }
}
