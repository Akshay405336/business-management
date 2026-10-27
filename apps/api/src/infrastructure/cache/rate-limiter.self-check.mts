/**
 * Executable self-check for rate limiter logic and Redis error classification.
 * Run: pnpm --filter @techwin/api run self-check:rate-limiter
 */
/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { loadEnvFile } from '../../config/load-env-file.js';
import { loadAppConfig } from '../../config/app-config.js';
import {
  buildIoredisOptions,
  describeRedisConnection,
  ioredisConnectionUrl,
  parseRedisConnection,
} from './redis-connection.options.js';
import { RedisInfrastructureError, wrapRedisCommandError } from './redis.errors.js';
import { decisionFromRedisHits } from './redis-rate-limiter.logic.js';
import { Redis } from 'ioredis';

function testDecisionLogic(): void {
  const policy = { name: 'test', limit: 3, windowSeconds: 60 };
  const allow = decisionFromRedisHits(policy, 2, 30_000);
  assert.equal(allow.allowed, true);
  assert.equal(allow.remaining, 1);
  assert.equal(allow.retryAfterSeconds, 0);

  const deny = decisionFromRedisHits(policy, 4, 12_000);
  assert.equal(deny.allowed, false);
  assert.equal(deny.remaining, 0);
  assert.equal(deny.retryAfterSeconds, 12);
}

function testTlsOptionsForUpstashShape(): void {
  const parsed = parseRedisConnection('rediss://default:secret@example.upstash.io:6379');
  assert.equal(parsed.tls, true);
  assert.equal(parsed.tlsInferredFromHost, false);
  assert.equal(parsed.host, 'example.upstash.io');
  const options = buildIoredisOptions(parsed);
  assert.ok(options.tls);
  assert.equal((options.tls as { servername?: string }).servername, 'example.upstash.io');
  const summary = describeRedisConnection(parsed);
  assert.ok(!summary.includes('secret'));
  assert.match(summary, /tls=true/);
}

function testUpstashRedisSchemeUpgradedToTls(): void {
  const parsed = parseRedisConnection('redis://default:secret@viable-walleye.example.upstash.io:6379');
  assert.equal(parsed.tls, true);
  assert.equal(parsed.tlsInferredFromHost, true);
  assert.match(ioredisConnectionUrl(parsed), /^rediss:\/\/default:secret@/);
  assert.ok(!describeRedisConnection(parsed).includes('secret'));
  assert.match(describeRedisConnection(parsed), /tlsInferredFromHost=true/);
}

function testRedisInfrastructureWrap(): void {
  const wrapped = wrapRedisCommandError(Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }));
  assert.ok(wrapped instanceof RedisInfrastructureError);
  assert.equal(wrapped.code, 'ECONNRESET');
}

async function testLiveRedisWhenConfigured(): Promise<void> {
  loadEnvFile();
  let config;
  try {
    config = loadAppConfig();
  } catch {
    console.log('SKIP live Redis: environment not fully configured');
    return;
  }
  const parsed = parseRedisConnection(config.redis.url);
  const client = new Redis(ioredisConnectionUrl(parsed), buildIoredisOptions(parsed));
  client.on('error', () => {
    /* self-check: errors handled in try/catch below */
  });
  try {
    await client.connect();
    const pong = await client.ping();
    assert.equal(pong, 'PONG');
    const policy = { name: 'self-check', limit: 5, windowSeconds: 60 };
    const key = `self-check:${Date.now()}`;
    const windowMs = policy.windowSeconds * 1000;
    const raw = (await client.eval(
      `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { hits, ttl }
`,
      1,
      `techwin:rl:${policy.name}:${key}`,
      String(windowMs),
    )) as [number, number];
    const decision = decisionFromRedisHits(policy, raw[0], raw[1]);
    assert.equal(decision.allowed, true);
    await client.del(`techwin:rl:${policy.name}:${key}`);
    await new Promise<void>((resolve) => {
      client.once('end', () => resolve());
      client.disconnect();
    });
    await client.connect();
    assert.equal(await client.ping(), 'PONG');
    console.log(`OK live Redis (${describeRedisConnection(parsed)})`);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(
      `FAIL live Redis (${describeRedisConnection(parsed)})${err.code ? ` code=${err.code}` : ''}: ${err.message}`,
    );
    process.exitCode = 1;
  } finally {
    if (client.status !== 'end') {
      client.disconnect();
    }
  }
}

testDecisionLogic();
testTlsOptionsForUpstashShape();
testUpstashRedisSchemeUpgradedToTls();
testRedisInfrastructureWrap();
await testLiveRedisWhenConfigured();
if (process.exitCode === 1) {
  process.exit(1);
}
console.log('rate-limiter self-check passed');
