import { Inject, Injectable } from '@nestjs/common';
import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimiter,
} from '../security/security.contracts.js';
import { wrapRedisCommandError } from './redis.errors.js';
import {
  CONSUME_SCRIPT,
  decisionFromRedisHits,
  rateLimitKeyFor,
} from './redis-rate-limiter.logic.js';
import { RedisService } from './redis.service.js';

export { CONSUME_SCRIPT, decisionFromRedisHits, rateLimitKeyFor };

@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async consume(policy: RateLimitPolicy, key: string): Promise<RateLimitDecision> {
    const windowMs = policy.windowSeconds * 1000;
    try {
      const raw = await this.redis.client.eval(
        CONSUME_SCRIPT,
        1,
        rateLimitKeyFor(policy, key),
        String(windowMs),
      );
      const [hits, ttlMs] = raw as [number, number];
      return decisionFromRedisHits(policy, hits, ttlMs);
    } catch (error) {
      throw wrapRedisCommandError(error);
    }
  }

  async reset(policy: RateLimitPolicy, key: string): Promise<void> {
    try {
      await this.redis.client.del(rateLimitKeyFor(policy, key));
    } catch (error) {
      throw wrapRedisCommandError(error);
    }
  }
}
