import { Module } from '@nestjs/common';
import { RedisRateLimiter } from './redis-rate-limiter.js';
import { RedisService } from './redis.service.js';

@Module({
  providers: [RedisService, RedisRateLimiter],
  exports: [RedisService, RedisRateLimiter],
})
export class CacheModule {}
