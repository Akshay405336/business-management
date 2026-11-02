import { Inject, Injectable } from '@nestjs/common';
import type { StoredObjectRecord } from '../../domain/repositories/stored-object.repository.js';
import { StoredFileService } from '../services/stored-file.service.js';
import type { GetFileMetadataQuery } from './get-file-metadata.query.js';

@Injectable()
export class GetFileMetadataHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(query: GetFileMetadataQuery): Promise<StoredObjectRecord> {
    return this.storedFiles.getGenericRecord(query.organizationId, query.storedObjectId);
  }
}
