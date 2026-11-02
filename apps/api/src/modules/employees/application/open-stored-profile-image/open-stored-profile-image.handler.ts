import { Inject, Injectable } from '@nestjs/common';
import { StoredFileService } from '../../../media/index.js';
import type { OpenStoredProfileImageQuery } from './open-stored-profile-image.query.js';

@Injectable()
export class OpenStoredProfileImageHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(query: OpenStoredProfileImageQuery) {
    return this.storedFiles.openInlineEmployeeProfile(
      query.organizationId,
      query.storedObjectId,
    );
  }
}
