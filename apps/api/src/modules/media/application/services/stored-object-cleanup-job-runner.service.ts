import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  MEDIA_CLEANUP_LOCK,
  type MediaCleanupLockPort,
} from '../../domain/ports/media-cleanup-lock.port.js';
import {
  STORED_FILE_SETTINGS,
  type StoredFileSettings,
} from '../../domain/ports/stored-file-settings.port.js';
import { ProcessCleanupQueueHandler } from '../process-cleanup-queue/process-cleanup-queue.handler.js';

const LOCK_TTL_MS = 120_000;
const LOCK_KEY = 'media:lock:storage-cleanup';

/**
 * Processes `storage_cleanup_jobs` on a timer. Only one replica holds the Redis
 * lock at a time; others skip the tick. Jobs remain PENDING until S3 delete
 * succeeds or `failCleanupJob` marks them FAILED after five attempts.
 *
 * Disable on secondary API replicas with `MEDIA_CLEANUP_WORKER_ENABLED=false`
 * (same pattern as `WHATSAPP_WORKER_ENABLED`).
 */
@Injectable()
export class StoredObjectCleanupJobRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoredObjectCleanupJobRunner.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @Inject(STORED_FILE_SETTINGS) private readonly settings: StoredFileSettings,
    @Inject(MEDIA_CLEANUP_LOCK) private readonly lock: MediaCleanupLockPort,
    @Inject(ProcessCleanupQueueHandler)
    private readonly processCleanup: ProcessCleanupQueueHandler,
  ) {}

  onModuleInit(): void {
    if (!this.settings.cleanupWorkerEnabled) {
      this.logger.log(
        'Storage cleanup worker disabled (MEDIA_CLEANUP_WORKER_ENABLED=false).',
      );
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.settings.cleanupIntervalMs);
    this.timer.unref();
    this.logger.log(
      `Storage cleanup worker started (interval=${this.settings.cleanupIntervalMs}ms, batch=${this.settings.cleanupBatchSize}).`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const ran = await this.lock.runExclusive(LOCK_KEY, LOCK_TTL_MS, async () => {
        const processed = await this.processCleanup.execute({
          limit: this.settings.cleanupBatchSize,
        });
        if (processed > 0) {
          this.logger.log(`Processed ${processed} storage cleanup job(s).`);
        }
      });
      if (!ran) {
        this.logger.debug('Storage cleanup tick skipped (another replica holds the lock).');
      }
    } catch (error) {
      this.logger.warn(
        `Storage cleanup tick failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }
}
