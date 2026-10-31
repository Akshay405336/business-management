import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../infrastructure/cache/redis.service.js';
import type { WhatsAppDistributedLockPort } from '../../domain/whatsapp.ports.js';

const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/**
 * Best-effort cross-instance mutex on the shared Redis connection. Row-level
 * claims (`FOR UPDATE SKIP LOCKED`) remain the correctness guarantee; this only
 * avoids redundant sweeps. When Redis is down the task still runs.
 */
@Injectable()
export class RedisWhatsAppLock implements WhatsAppDistributedLockPort {
  private readonly logger = new Logger(RedisWhatsAppLock.name);

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async runExclusive(name: string, ttlMs: number, task: () => Promise<void>): Promise<boolean> {
    const key = `whatsapp:lock:${name}`;
    const token = randomUUID();
    let acquired = true;
    try {
      acquired = (await this.redis.client.set(key, token, 'PX', ttlMs, 'NX')) === 'OK';
    } catch (error) {
      this.logger.warn(
        `whatsapp.lock.unavailable name=${name}: ${error instanceof Error ? error.message : 'error'}`,
      );
    }
    if (!acquired) return false;
    try {
      await task();
    } finally {
      await this.redis.client.eval(RELEASE_SCRIPT, 1, key, token).catch(() => undefined);
    }
    return true;
  }
}
