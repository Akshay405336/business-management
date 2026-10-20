import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.redis.url, {
      lazyConnect: true,
      // Fail fast instead of queueing commands while disconnected, so callers
      // can apply their own fail-open / fail-closed policy.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
    });
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis connection ready');
    } catch (error) {
      // Startup continues; readiness reports Redis as down until it reconnects.
      this.logger.error(`Redis is unavailable at startup: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  async ping(): Promise<void> {
    const reply = await this.client.ping();
    if (reply !== 'PONG') throw new Error('Unexpected Redis PING reply');
  }
}
