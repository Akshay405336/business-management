import type { RateLimitDecision, RateLimitPolicy } from '../security/security.contracts.js';

/**
 * Atomic fixed-window counter shared by every API instance. Returns the hit
 * count and the remaining window in milliseconds.
 */
export const CONSUME_SCRIPT = `
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

/** Maps Redis INCR script output to an allow/deny decision (not an infrastructure error). */
export function decisionFromRedisHits(
  policy: RateLimitPolicy,
  hits: number,
  ttlMs: number,
): RateLimitDecision {
  const allowed = hits <= policy.limit;
  return {
    allowed,
    remaining: Math.max(0, policy.limit - hits),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
  };
}

export function rateLimitKeyFor(policy: RateLimitPolicy, key: string): string {
  return `techwin:rl:${policy.name}:${key}`;
}
