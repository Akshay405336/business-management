import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { StorageModule } from '../../infrastructure/storage/storage.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { StoredFileService } from './application/stored-file.service.js';
import { STORED_OBJECT_REPOSITORY } from './domain/repositories/stored-object.repository.js';
import { PrismaStoredObjectRepository } from './infrastructure/persistence/prisma/prisma-stored-object.repository.js';
import { MediaController } from './presentation/http/controllers/media.controller.js';
import { MediaExceptionFilter } from './presentation/http/filters/media-exception.filter.js';

export const mediaPersistenceProviders: Provider[] = [
  { provide: STORED_OBJECT_REPOSITORY, useClass: PrismaStoredObjectRepository },
];

@Module({
  imports: [DatabaseModule, StorageModule, AuthModule, CrmModule, OrgAccessModule],
  controllers: [MediaController],
  providers: [...mediaPersistenceProviders, StoredFileService, MediaExceptionFilter],
  exports: [StoredFileService],
})
export class MediaModule {}
