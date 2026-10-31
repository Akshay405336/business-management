import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import type {
  CreateStoredObjectInput,
  StoredObjectRecord,
  StoredObjectRepository,
} from '../../../domain/repositories/stored-object.repository.js';

@Injectable()
export class PrismaStoredObjectRepository implements StoredObjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    organizationId: string;
    provider: StoredObjectRecord['provider'];
    bucket: string;
    objectKey: string;
    originalFileName: string;
    displayFileName: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string | null;
    category: StoredObjectRecord['category'];
    status: StoredObjectRecord['status'];
    createdByAdminId: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): StoredObjectRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      provider: row.provider,
      bucket: row.bucket,
      objectKey: row.objectKey,
      originalFileName: row.originalFileName,
      displayFileName: row.displayFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      category: row.category,
      status: row.status,
      createdByAdminId: row.createdByAdminId,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

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
    return this.map(row);
  }

  async findActiveById(organizationId: string, id: string): Promise<StoredObjectRecord | null> {
    const row = await this.prisma.storedObject.findFirst({
      where: { id, organizationId, status: 'ACTIVE' },
    });
    return row ? this.map(row) : null;
  }

  async findByIdIncludingDeleted(
    organizationId: string,
    id: string,
  ): Promise<StoredObjectRecord | null> {
    const row = await this.prisma.storedObject.findFirst({
      where: { id, organizationId },
    });
    return row ? this.map(row) : null;
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
    const rows = await this.prisma.storageCleanupJob.findMany({
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
    return rows;
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
