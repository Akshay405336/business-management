import { Inject, Injectable } from '@nestjs/common';
import { StoredFileService } from '../services/stored-file.service.js';
import type { OpenFileContentQuery } from './open-file-content.query.js';

@Injectable()
export class OpenFileContentHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(query: OpenFileContentQuery) {
    return this.storedFiles.openDownload(query.organizationId, query.storedObjectId);
  }
}
