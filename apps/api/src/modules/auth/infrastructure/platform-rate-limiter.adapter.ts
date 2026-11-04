import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';
import { RedisRateLimiter } from '../../../infrastructure/cache/redis-rate-limiter.js';
import { isRedisInfrastructureError } from '../../../infrastructure/cache/redis.errors.js';
import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';

/**
 * Rate limiter for platform authentication. Keys (emails, IP addresses) are
 * hashed so Redis never holds identifying data. In production the limiter fails
 * closed when Redis is unreachable; in local development it fails open so auth
 * still works without a Redis process.
 */
@Injectable()
export class PlatformRateLimiterAdapter implements RateLimiter {
  private readonly logger = new Logger(PlatformRateLimiterAdapter.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(RedisRateLimiter) private readonly limiter: RedisRateLimiter,
  ) {}

  async consume(policy: RateLimitPolicy, key: string): Promise<RateLimitDecision> {
    try {
      const decision = await this.limiter.consume(this.scoped(policy), digest(key));
      if (!decision.allowed) {
        this.logger.debug(
          `Rate limit exceeded policy=${policy.name} retryAfterSeconds=${decision.retryAfterSeconds}`,
        );
      }
      return decision;
    } catch (error) {
      if (isRedisInfrastructureError(error)) {
        if (!this.config.isProduction) {
          this.logger.warn(
            `Rate limiter unavailable (allowing request in ${this.config.nodeEnv}) policy=${policy.name}${error.code ? ` redisCode=${error.code}` : ''}: ${error.message}`,
          );
          return { allowed: true, remaining: policy.limit, retryAfterSeconds: 0 };
        }
        this.logger.error(
          `Rate limiter backend unavailable policy=${policy.name}${error.code ? ` redisCode=${error.code}` : ''}: ${error.message}`,
        );
        throw new ServiceUnavailableException(
          'Sign-in is temporarily unavailable. Please try again shortly.',
        );
      }
      this.logger.error(
        `Rate limiter unexpected failure policy=${policy.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'Sign-in is temporarily unavailable. Please try again shortly.',
      );
    }
  }

  async reset(policy: RateLimitPolicy, key: string): Promise<void> {
    try {
      await this.limiter.reset(this.scoped(policy), digest(key));
    } catch (error) {
      if (isRedisInfrastructureError(error)) {
        this.logger.warn(
          `Rate limiter reset skipped (Redis unavailable) policy=${policy.name}${error.code ? ` redisCode=${error.code}` : ''}`,
        );
        return;
      }
      this.logger.warn(
        `Rate limiter reset failed policy=${policy.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private scoped(policy: RateLimitPolicy): RateLimitPolicy {
    return { ...policy, name: `platform-auth:${policy.name}` };
  }
}

const digest = (key: string): string => createHash('sha256').update(key).digest('hex').slice(0, 32);
