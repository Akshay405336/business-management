import type {
  StoredObjectCategory,
  StoredObjectProvider,
  StoredObjectStatus,
} from '../../../../generated/prisma/client.js';

export type StoredObjectRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: StoredObjectProvider;
  readonly bucket: string;
  readonly objectKey: string;
  readonly originalFileName: string;
  readonly displayFileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly category: StoredObjectCategory;
  readonly status: StoredObjectStatus;
  readonly createdByAdminId: string;
  readonly deletedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateStoredObjectInput = {
  readonly id: string;
  readonly organizationId: string;
  readonly provider: StoredObjectProvider;
  readonly bucket: string;
  readonly objectKey: string;
  readonly originalFileName: string;
  readonly displayFileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly category: StoredObjectCategory;
  readonly createdByAdminId: string;
};

export const STORED_OBJECT_REPOSITORY = Symbol('STORED_OBJECT_REPOSITORY');

export interface StoredObjectRepository {
  create(input: CreateStoredObjectInput): Promise<StoredObjectRecord>;
  findActiveById(organizationId: string, id: string): Promise<StoredObjectRecord | null>;
  markDeleted(organizationId: string, id: string): Promise<void>;
  isReferenced(storedObjectId: string): Promise<boolean>;
  findEmployeeIdUsingProfileImage(storedObjectId: string): Promise<string | null>;
  enqueueCleanupJob(
    organizationId: string,
    storedObjectId: string,
    jobId: string,
    lastError: string,
  ): Promise<void>;
  listPendingCleanupJobs(limit: number): Promise<
    readonly {
      readonly id: string;
      readonly organizationId: string;
      readonly storedObjectId: string;
      readonly attemptCount: number;
    }[]
  >;
  completeCleanupJob(jobId: string): Promise<void>;
  failCleanupJob(jobId: string, attemptCount: number, lastError: string): Promise<void>;
  findByIdIncludingDeleted(organizationId: string, id: string): Promise<StoredObjectRecord | null>;
}
