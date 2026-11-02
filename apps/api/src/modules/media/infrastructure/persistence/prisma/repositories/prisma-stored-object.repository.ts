import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import type {
  CreateStoredObjectInput,
  StoredObjectRecord,
  StoredObjectRepository,
} from '../../../../domain/repositories/stored-object.repository.js';
import { mapStoredObjectRow } from '../mappers/stored-object.mapper.js';

@Injectable()
export class PrismaStoredObjectRepository implements StoredObjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateStoredObjectInput): Promise<StoredObjectRecord> {
    const row = await this.prisma.storedObject.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        provider: input.provider,
        bucket: input.bucket,
        objectKey: input.objectKey,
        originalFileName: input.originalFileName,
        displayFileName: input.displayFileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
        category: input.category,
        createdByAdminId: input.createdByAdminId,
      },
    });
    return mapStoredObjectRow(row);
  }

  async findActiveById(organizationId: string, id: string): Promise<StoredObjectRecord | null> {
    const row = await this.prisma.storedObject.findFirst({
      where: { id, organizationId, status: 'ACTIVE' },
    });
    return row ? mapStoredObjectRow(row) : null;
  }

  async findByIdIncludingDeleted(
    organizationId: string,
    id: string,
  ): Promise<StoredObjectRecord | null> {
    const row = await this.prisma.storedObject.findFirst({
      where: { id, organizationId },
    });
    return row ? mapStoredObjectRow(row) : null;
  }

  async markDeleted(organizationId: string, id: string): Promise<void> {
    await this.prisma.storedObject.updateMany({
      where: { id, organizationId, status: 'ACTIVE' },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }

  async isReferenced(storedObjectId: string): Promise<boolean> {
    const [employee, whatsappMessage] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { profileImageStoredObjectId: storedObjectId },
        select: { id: true },
      }),
      this.prisma.whatsAppMessage.findFirst({
        where: { mediaStoredObjectId: storedObjectId },
        select: { id: true },
      }),
    ]);
    return employee !== null || whatsappMessage !== null;
  }

  async findEmployeeIdUsingProfileImage(storedObjectId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { profileImageStoredObjectId: storedObjectId },
      select: { id: true },
    });
    return employee?.id ?? null;
  }

  async enqueueCleanupJob(
    organizationId: string,
    storedObjectId: string,
    jobId: string,
    lastError: string,
  ): Promise<void> {
    await this.prisma.storageCleanupJob.create({
      data: {
        id: jobId,
        organizationId,
        storedObjectId,
        status: 'PENDING',
        attemptCount: 0,
        lastError: lastError.slice(0, 2000),
      },
    });
  }

  async listPendingCleanupJobs(limit: number) {
    return this.prisma.storageCleanupJob.findMany({
      where: { status: 'PENDING' },
      orderBy: { updatedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        organizationId: true,
        storedObjectId: true,
        attemptCount: true,
      },
    });
  }

  async completeCleanupJob(jobId: string): Promise<void> {
    await this.prisma.storageCleanupJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' },
    });
  }

  async failCleanupJob(jobId: string, attemptCount: number, lastError: string): Promise<void> {
    await this.prisma.storageCleanupJob.update({
      where: { id: jobId },
      data: {
        attemptCount,
        lastError: lastError.slice(0, 2000),
        status: attemptCount >= 5 ? 'FAILED' : 'PENDING',
      },
    });
  }
}
