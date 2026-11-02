import { Inject, Injectable } from '@nestjs/common';
import { StoredFileService } from '../services/stored-file.service.js';
import type { ProcessCleanupQueueCommand } from './process-cleanup-queue.command.js';

@Injectable()
export class ProcessCleanupQueueHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  execute(command: ProcessCleanupQueueCommand = {}): Promise<number> {
    return this.storedFiles.processCleanupQueue(command.limit ?? 20);
  }
}
