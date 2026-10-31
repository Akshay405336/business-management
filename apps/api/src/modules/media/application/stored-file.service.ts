import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMPLOYEE_ROUTES, MEDIA_ROUTES } from '@techwin/contracts';
import type { StoredObjectCategory } from '../../../generated/prisma/client.js';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import { LOCAL_BUCKET } from '../../../infrastructure/storage/local-object-storage.js';
import {
  OBJECT_STORAGE,
  type ObjectStoragePort,
} from '../../../infrastructure/storage/object-storage.types.js';
import {
  extensionForMime,
  policyForCategory,
  sanitizeDisplayFileName,
  sniffImageMime,
  type UploadedFilePayload,
} from '../domain/file-category-policy.js';
import {
  MediaConflictError,
  MediaForbiddenError,
  MediaNotFoundError,
  MediaStorageError,
  MediaValidationError,
} from '../domain/errors/media.errors.js';
import {
  STORED_OBJECT_REPOSITORY,
  type StoredObjectRecord,
  type StoredObjectRepository,
} from '../domain/repositories/stored-object.repository.js';

/** Categories readable only through their owning module's authorization (never the generic media API). */
const CONVERSATION_SCOPED_CATEGORIES: ReadonlySet<StoredObjectCategory> = new Set([
  'WHATSAPP_MEDIA',
]);

export type StoredFileUploadResult = {
  readonly id: string;
  readonly previewUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly displayFileName: string;
};

@Injectable()
export class StoredFileService {
  private readonly logger = new Logger(StoredFileService.name);

  constructor(
    @Inject(STORED_OBJECT_REPOSITORY) private readonly repository: StoredObjectRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  previewPath(storedObjectId: string): string {
    return MEDIA_ROUTES.storedObjectContent(storedObjectId);
  }

  employeeProfileContentPath(storedObjectId: string): string {
    return EMPLOYEE_ROUTES.employeeStoredProfileImageContent(storedObjectId);
  }

  resolveProfileImageUrl(record: {
    profileImageStoredObjectId: string | null;
    profileImageUrl: string | null;
  }): string | null {
    if (record.profileImageStoredObjectId) {
      return this.employeeProfileContentPath(record.profileImageStoredObjectId);
    }
    return record.profileImageUrl;
  }

  async openInlineEmployeeProfile(
    organizationId: string,
    storedObjectId: string,
  ): Promise<{ body: Buffer; contentType: string }> {
    const record = await this.getAuthorizedRecord(organizationId, storedObjectId);
    if (record.category !== 'EMPLOYEE_PROFILE_IMAGE') {
      throw new MediaForbiddenError();
    }
    if (record.provider === 'LOCAL') {
      if (!this.storage.readLocalObject) {
        throw new MediaStorageError();
      }
      return this.storage.readLocalObject({ bucket: record.bucket, key: record.objectKey });
    }
    if (!this.storage.readObject) {
      throw new MediaStorageError();
    }
    return this.storage.readObject({ bucket: record.bucket, key: record.objectKey });
  }

  private bucketForProvider(): { provider: 'S3' | 'LOCAL'; bucket: string } {
    if (this.config.storage.provider === 's3') {
      return { provider: 'S3', bucket: this.config.storage.s3.bucket };
    }
    return { provider: 'LOCAL', bucket: LOCAL_BUCKET };
  }

  private objectKey(organizationId: string, category: StoredObjectCategory, ext: string): string {
    return `org/${organizationId}/${category.toLowerCase()}/${randomUUID()}.${ext}`;
  }

  async upload(params: {
    organizationId: string;
    adminId: string;
    category: StoredObjectCategory;
    file: UploadedFilePayload;
  }): Promise<StoredFileUploadResult> {
    const policy = policyForCategory(params.category, this.config.storage.employeeProfileMaxBytes);
    const file = params.file;
    if (!file?.buffer?.length) {
      throw new MediaValidationError('Select a file to upload.');
    }
    if (file.size > policy.maxBytes) {
      throw new MediaValidationError(
        `File must be ${Math.round(policy.maxBytes / (1024 * 1024))} MB or smaller.`,
      );
    }
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed || !policy.allowedMimeTypes.has(sniffed)) {
      throw new MediaValidationError('Use a JPEG, PNG, or WebP image.');
    }
    if (!policy.allowedMimeTypes.has(file.mimetype)) {
      throw new MediaValidationError('Unsupported file type.');
    }

    const ext = extensionForMime(sniffed);
    const { provider, bucket } = this.bucketForProvider();
    const objectKey = this.objectKey(params.organizationId, params.category, ext);
    const checksumSha256 = createHash('sha256').update(file.buffer).digest('hex');
    const id = randomUUID();

    try {
      await this.storage.putObject({
        bucket,
        key: objectKey,
        body: file.buffer,
        contentType: sniffed,
        contentLength: file.size,
      });
    } catch {
      throw new MediaStorageError();
    }

    try {
      const record = await this.repository.create({
        id,
        organizationId: params.organizationId,
        provider,
        bucket,
        objectKey,
        originalFileName: file.originalname.slice(0, 255),
        displayFileName: sanitizeDisplayFileName(file.originalname),
        mimeType: sniffed,
        sizeBytes: file.size,
        checksumSha256,
        category: params.category,
        createdByAdminId: params.adminId,
      });
      return {
        id: record.id,
        previewUrl:
          params.category === 'EMPLOYEE_PROFILE_IMAGE'
            ? this.employeeProfileContentPath(record.id)
            : this.previewPath(record.id),
        mimeType: record.mimeType,
        sizeBytes: record.sizeBytes,
        displayFileName: record.displayFileName,
      };
    } catch (error) {
      await this.storage.deleteObject({ bucket, key: objectKey }).catch((cleanupError) => {
        this.logger.warn(
          { storedObjectId: id, organizationId: params.organizationId, err: cleanupError },
          'storage.upload.db_failed.compensating_delete_failed',
        );
      });
      throw error;
    }
  }

  /**
   * Stores a buffer produced server-side (e.g. media fetched from a provider API).
   * Callers are responsible for MIME and size policy before calling this.
   */
  async storeBuffer(params: {
    organizationId: string;
    adminId: string;
    category: StoredObjectCategory;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
    extension: string;
  }): Promise<{ id: string; sizeBytes: number; mimeType: string; displayFileName: string }> {
    const { provider, bucket } = this.bucketForProvider();
    const objectKey = this.objectKey(params.organizationId, params.category, params.extension);
    const id = randomUUID();
    try {
      await this.storage.putObject({
        bucket,
        key: objectKey,
        body: params.buffer,
        contentType: params.mimeType,
        contentLength: params.buffer.length,
      });
    } catch {
      throw new MediaStorageError();
    }
    try {
      const record = await this.repository.create({
        id,
        organizationId: params.organizationId,
        provider,
        bucket,
        objectKey,
        originalFileName: params.fileName.slice(0, 255),
        displayFileName: sanitizeDisplayFileName(params.fileName),
        mimeType: params.mimeType,
        sizeBytes: params.buffer.length,
        checksumSha256: createHash('sha256').update(params.buffer).digest('hex'),
        category: params.category,
        createdByAdminId: params.adminId,
      });
      return {
        id: record.id,
        sizeBytes: record.sizeBytes,
        mimeType: record.mimeType,
        displayFileName: record.displayFileName,
      };
    } catch (error) {
      await this.storage.deleteObject({ bucket, key: objectKey }).catch((cleanupError: unknown) => {
        this.logger.warn(
          { storedObjectId: id, organizationId: params.organizationId, err: cleanupError },
          'storage.store_buffer.db_failed.compensating_delete_failed',
        );
      });
      throw error;
    }
  }

  /** Opens content of a category-restricted object for a caller that already authorized access. */
  async openCategoryObject(
    organizationId: string,
    id: string,
    category: StoredObjectCategory,
  ): Promise<{ redirectUrl?: string; stream?: { body: Buffer; contentType: string } }> {
    const record = await this.getAuthorizedRecord(organizationId, id);
    if (record.category !== category) throw new MediaForbiddenError();
    return this.openRecord(record);
  }

  async assertAssignableProfileImage(
    organizationId: string,
    storedObjectId: string,
    employeeId?: string,
  ): Promise<StoredObjectRecord> {
    const record = await this.repository.findActiveById(organizationId, storedObjectId);
    if (!record) throw new MediaNotFoundError();
    if (record.category !== 'EMPLOYEE_PROFILE_IMAGE') {
      throw new MediaValidationError('Invalid profile image file.');
    }
    const usedBy = await this.repository.findEmployeeIdUsingProfileImage(storedObjectId);
    if (usedBy && usedBy !== employeeId) {
      throw new MediaConflictError('This image is already linked to another employee.');
    }
    return record;
  }

  async getAuthorizedRecord(organizationId: string, id: string): Promise<StoredObjectRecord> {
    const record = await this.repository.findActiveById(organizationId, id);
    if (!record) throw new MediaNotFoundError();
    return record;
  }

  /** Metadata lookup for the generic media API; conversation-scoped files are excluded. */
  async getGenericRecord(organizationId: string, id: string): Promise<StoredObjectRecord> {
    const record = await this.getAuthorizedRecord(organizationId, id);
    if (CONVERSATION_SCOPED_CATEGORIES.has(record.category)) throw new MediaForbiddenError();
    return record;
  }

  async deleteUnreferenced(organizationId: string, storedObjectId: string): Promise<void> {
    const record = await this.repository.findActiveById(organizationId, storedObjectId);
    if (!record) return;
    if (await this.repository.isReferenced(storedObjectId)) {
      throw new MediaConflictError('File is still in use and cannot be deleted.');
    }
    await this.repository.markDeleted(organizationId, storedObjectId);
    try {
      await this.storage.deleteObject({ bucket: record.bucket, key: record.objectKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'delete failed';
      await this.repository.enqueueCleanupJob(
        organizationId,
        storedObjectId,
        randomUUID(),
        message,
      );
      this.logger.warn(
        { storedObjectId, organizationId },
        'storage.delete.object_failed.enqueued_cleanup',
      );
    }
  }

  async scheduleOrphanCleanup(
    organizationId: string,
    previousStoredObjectId: string | null | undefined,
  ): Promise<void> {
    if (!previousStoredObjectId) return;
    if (await this.repository.isReferenced(previousStoredObjectId)) return;
    await this.deleteUnreferenced(organizationId, previousStoredObjectId).catch((error) => {
      this.logger.warn(
        { storedObjectId: previousStoredObjectId, organizationId, err: error },
        'storage.profile_image.orphan_cleanup_failed',
      );
    });
  }

  async openDownload(
    organizationId: string,
    id: string,
  ): Promise<{ redirectUrl?: string; stream?: { body: Buffer; contentType: string } }> {
    const record = await this.getAuthorizedRecord(organizationId, id);
    if (CONVERSATION_SCOPED_CATEGORIES.has(record.category)) throw new MediaForbiddenError();
    return this.openRecord(record);
  }

  private async openRecord(
    record: StoredObjectRecord,
  ): Promise<{ redirectUrl?: string; stream?: { body: Buffer; contentType: string } }> {
    if (record.provider === 'S3') {
      const redirectUrl = await this.storage.getPresignedDownloadUrl({
        bucket: record.bucket,
        key: record.objectKey,
        expiresInSeconds: this.config.storage.presignedTtlSeconds,
        responseContentType: record.mimeType,
        responseContentDisposition: `inline; filename="${record.displayFileName}"`,
      });
      return { redirectUrl };
    }
    if (!this.storage.readLocalObject) {
      throw new MediaStorageError();
    }
    const stream = await this.storage.readLocalObject({
      bucket: record.bucket,
      key: record.objectKey,
    });
    return { stream };
  }

  async processCleanupQueue(limit = 20): Promise<number> {
    const jobs = await this.repository.listPendingCleanupJobs(limit);
    let processed = 0;
    for (const job of jobs) {
      const record = await this.repository.findByIdIncludingDeleted(
        job.organizationId,
        job.storedObjectId,
      );
      if (!record) {
        await this.repository.completeCleanupJob(job.id);
        processed += 1;
        continue;
      }
      try {
        await this.storage.deleteObject({ bucket: record.bucket, key: record.objectKey });
        await this.repository.completeCleanupJob(job.id);
        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'cleanup failed';
        await this.repository.failCleanupJob(job.id, job.attemptCount + 1, message);
      }
    }
    return processed;
  }
}

export { MediaForbiddenError };
