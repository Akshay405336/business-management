import { HttpStatus, Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { API_ERROR_CODES } from '@techwin/contracts';
import type { NextFunction, Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { RedisRateLimiter } from '../../infrastructure/cache/redis-rate-limiter.js';
import type { RateLimitPolicy } from '../../infrastructure/security/security.contracts.js';
import { sendApiError } from '../filters/api-error.response.js';

/**
 * Coarse per-IP request ceiling shared by all API instances. It fails open when
 * Redis is unreachable; authentication endpoints have their own fail-closed
 * limits on top of this one.
 */
@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GlobalRateLimitMiddleware.name);
  private readonly policy: RateLimitPolicy;

  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    @Inject(RedisRateLimiter) private readonly limiter: RedisRateLimiter,
  ) {
    this.policy = { name: 'global-ip', limit: config.rateLimit.globalPerMinute, windowSeconds: 60 };
  }

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const decision = await this.limiter.consume(this.policy, request.ip ?? 'unknown');
      response.setHeader('RateLimit-Limit', String(this.policy.limit));
      response.setHeader('RateLimit-Remaining', String(decision.remaining));
      if (!decision.allowed) {
        sendApiError(request, response, {
          status: HttpStatus.TOO_MANY_REQUESTS,
          code: API_ERROR_CODES.RATE_LIMITED,
          message: 'Too many requests. Please slow down.',
          retryAfterSeconds: decision.retryAfterSeconds,
        });
        return;
      }
    } catch (error) {
      this.logger.warn(`Global rate limiter unavailable: ${(error as Error).message}`);
    }
    next();
  }
}
