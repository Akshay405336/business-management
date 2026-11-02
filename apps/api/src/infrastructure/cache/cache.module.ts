import { Module } from '@nestjs/common';
import { RedisExclusiveLockService } from './redis-exclusive-lock.service.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';
import { RedisService } from './redis.service.js';

@Module({
  providers: [RedisService, RedisRateLimiter, RedisExclusiveLockService],
  exports: [RedisService, RedisRateLimiter, RedisExclusiveLockService],
})
export class CacheModule {}
