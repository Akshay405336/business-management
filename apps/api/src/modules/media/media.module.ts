import { Module, type Provider } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  OBJECT_STORAGE,
  type ObjectStoragePort,
} from '../../infrastructure/storage/object-storage.types.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { AuthModule } from '../auth/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { DeleteFileHandler } from './application/delete-file/delete-file.handler.js';
import { GetFileMetadataHandler } from './application/get-file-metadata/get-file-metadata.handler.js';
import { OpenFileContentHandler } from './application/open-file-content/open-file-content.handler.js';
import { ProcessCleanupQueueHandler } from './application/process-cleanup-queue/process-cleanup-queue.handler.js';
import { StoredFileService } from './application/services/stored-file.service.js';
import { UploadFileHandler } from './application/upload-file/upload-file.handler.js';
import { MEDIA_OBJECT_STORAGE } from './domain/ports/object-storage.port.js';
import { STORED_OBJECT_REPOSITORY } from './domain/repositories/stored-object.repository.js';
import { storedFileSettingsProviders } from './infrastructure/adapters/stored-file-settings.adapter.js';
import { PrismaStoredObjectRepository } from './infrastructure/persistence/prisma/repositories/prisma-stored-object.repository.js';
import { MediaController } from './presentation/http/controllers/media.controller.js';
import { StoredObjectCleanupJobRunner } from './application/services/stored-object-cleanup-job-runner.service.js';
import { RedisMediaCleanupLockAdapter } from './infrastructure/cache/redis-media-cleanup-lock.adapter.js';
import { MEDIA_CLEANUP_LOCK } from './domain/ports/media-cleanup-lock.port.js';
import { MediaExceptionFilter } from './presentation/http/filters/media-exception.filter.js';

export const mediaPersistenceProviders: Provider[] = [
  { provide: STORED_OBJECT_REPOSITORY, useClass: PrismaStoredObjectRepository },
  RedisMediaCleanupLockAdapter,
  { provide: MEDIA_CLEANUP_LOCK, useExisting: RedisMediaCleanupLockAdapter },
  ...storedFileSettingsProviders,
  {
    provide: MEDIA_OBJECT_STORAGE,
    useFactory: (storage: ObjectStoragePort) => storage,
    inject: [OBJECT_STORAGE],
  },
];

const mediaUseCaseHandlers = [
  UploadFileHandler,
  GetFileMetadataHandler,
  OpenFileContentHandler,
  DeleteFileHandler,
  ProcessCleanupQueueHandler,
] as const;

@Module({
  imports: [DatabaseModule, StorageModule, CacheModule, AuthModule, OrgAccessModule],
  controllers: [MediaController],
  providers: [
    ...mediaPersistenceProviders,
    StoredFileService,
    StoredObjectCleanupJobRunner,
    MediaExceptionFilter,
    ...mediaUseCaseHandlers,
  ],
  exports: [StoredFileService, MediaExceptionFilter],
})
export class MediaModule {}
