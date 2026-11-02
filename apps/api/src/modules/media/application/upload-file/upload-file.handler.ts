import { Inject, Injectable } from '@nestjs/common';
import {
  StoredFileService,
  type StoredFileUploadResult,
} from '../services/stored-file.service.js';
import type { UploadFileCommand } from './upload-file.command.js';

@Injectable()
export class UploadFileHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(command: UploadFileCommand): Promise<StoredFileUploadResult> {
    return this.storedFiles.upload({
      organizationId: command.organizationId,
      adminId: command.adminId,
      category: command.category,
      file: command.file,
    });
  }
}
