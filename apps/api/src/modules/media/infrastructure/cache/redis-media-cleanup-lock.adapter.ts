import { Inject, Injectable } from '@nestjs/common';
import { RedisExclusiveLockService } from '../../../../infrastructure/cache/redis-exclusive-lock.service.js';
import type { MediaCleanupLockPort } from '../../domain/ports/media-cleanup-lock.port.js';

@Injectable()
export class RedisMediaCleanupLockAdapter implements MediaCleanupLockPort {
  constructor(@Inject(RedisExclusiveLockService) private readonly lock: RedisExclusiveLockService) {}

  runExclusive(lockKey: string, ttlMs: number, task: () => Promise<void>): Promise<boolean> {
    return this.lock.runExclusive(lockKey, ttlMs, task);
  }
}
