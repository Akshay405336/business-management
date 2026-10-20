import { Inject, Injectable } from '@nestjs/common';
import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimiter,
} from '../security/security.contracts.js';
import { RedisService } from './redis.service.js';

/**
 * Atomic fixed-window counter shared by every API instance. Returns the hit
 * count and the remaining window in milliseconds.
 */
const CONSUME_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { hits, ttl }
`;

@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async consume(policy: RateLimitPolicy, key: string): Promise<RateLimitDecision> {
    const windowMs = policy.windowSeconds * 1000;
    const [hits, ttlMs] = (await this.redis.client.eval(
      CONSUME_SCRIPT,
      1,
      this.keyFor(policy, key),
      String(windowMs),
    )) as [number, number];

    const allowed = hits <= policy.limit;
    return {
      allowed,
      remaining: Math.max(0, policy.limit - hits),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  }

  async reset(policy: RateLimitPolicy, key: string): Promise<void> {
    await this.redis.client.del(this.keyFor(policy, key));
  }

  private keyFor(policy: RateLimitPolicy, key: string): string {
    return `techwin:rl:${policy.name}:${key}`;
  }
}
