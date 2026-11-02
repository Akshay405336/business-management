import { Inject, Injectable } from '@nestjs/common';
import { RedisExclusiveLockService } from '../../../../infrastructure/cache/redis-exclusive-lock.service.js';
import type { WhatsAppDistributedLockPort } from '../../domain/whatsapp.ports.js';

/**
 * WhatsApp job mutex; delegates to the shared Redis lock with a module-specific key prefix.
 */
@Injectable()
export class RedisWhatsAppLock implements WhatsAppDistributedLockPort {
  constructor(@Inject(RedisExclusiveLockService) private readonly lock: RedisExclusiveLockService) {}

  runExclusive(name: string, ttlMs: number, task: () => Promise<void>): Promise<boolean> {
    return this.lock.runExclusive(`whatsapp:lock:${name}`, ttlMs, task);
  }
}
