import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { RedisService } from './redis.service.js';

const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/**
 * Cross-instance mutex on the shared Redis connection.
 * Default: if Redis SET fails, the task still runs (legacy / single-replica friendly).
 * Set `DISTRIBUTED_LOCK_STRICT=true` to skip the task when the lock cannot be acquired.
 */
@Injectable()
export class RedisExclusiveLockService {
  private readonly logger = new Logger(RedisExclusiveLockService.name);

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async runExclusive(
    lockKey: string,
    ttlMs: number,
    task: () => Promise<void>,
  ): Promise<boolean> {
    const token = randomUUID();
    let acquired = true;
    try {
      acquired = (await this.redis.client.set(lockKey, token, 'PX', ttlMs, 'NX')) === 'OK';
    } catch (error) {
      this.logger.warn(
        `redis.lock.unavailable key=${lockKey}: ${error instanceof Error ? error.name : 'Error'}`,
      );
      if (this.config.distributedLock.strict) acquired = false;
    }
    if (!acquired) return false;
    try {
      await task();
    } finally {
      await this.redis.client.eval(RELEASE_SCRIPT, 1, lockKey, token).catch(() => undefined);
    }
    return true;
  }
}
