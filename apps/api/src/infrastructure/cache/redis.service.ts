import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import {
  buildIoredisOptions,
  describeRedisConnection,
  ioredisConnectionUrl,
  parseRedisConnection,
} from './redis-connection.options.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;
  private readonly connectionSummary: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const parsed = parseRedisConnection(config.redis.url);
    this.connectionSummary = describeRedisConnection(parsed);
    if (parsed.tlsInferredFromHost) {
      this.logger.warn(
        `REDIS_URL uses redis:// for ${parsed.host}; connecting with TLS (prefer rediss:// in REDIS_URL)`,
      );
    }
    this.client = new Redis(ioredisConnectionUrl(parsed), buildIoredisOptions(parsed));
    this.client.on('error', (error: Error) => {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as NodeJS.ErrnoException).code ?? '')
          : '';
      this.logger.warn(
        `Redis connection error (${this.connectionSummary})${code ? ` code=${code}` : ''}: ${error.message}`,
      );
    });
    this.client.on('connect', () => {
      this.logger.log(`Redis TCP connected (${this.connectionSummary})`);
    });
    this.client.on('ready', () => {
      this.logger.log(`Redis ready (${this.connectionSummary})`);
    });
    this.client.on('reconnecting', () => {
      this.logger.warn(`Redis reconnecting (${this.connectionSummary})`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      this.logger.error(
        `Redis unavailable at startup (${this.connectionSummary})${err.code ? ` code=${err.code}` : ''}: ${err.message}`,
      );
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
