import { Inject, Injectable } from '@nestjs/common';
import { StoredFileService } from '../services/stored-file.service.js';
import type { DeleteFileCommand } from './delete-file.command.js';

@Injectable()
export class DeleteFileHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(command: DeleteFileCommand): Promise<void> {
    return this.storedFiles.deleteUnreferenced(command.organizationId, command.storedObjectId);
  }
}
