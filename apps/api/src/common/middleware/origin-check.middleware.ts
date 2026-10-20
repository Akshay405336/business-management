import { HttpStatus, Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { API_ERROR_CODES } from '@techwin/contracts';
import type { NextFunction, Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { sendApiError } from '../filters/api-error.response.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * First CSRF layer for state-changing requests: browsers always attach
 * `Origin` (and `Sec-Fetch-Site`) to cross-origin writes, so anything coming
 * from an origin outside the allowlist is rejected before reaching a handler.
 * Cookie-authenticated endpoints additionally require a session-bound token.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.allowedOrigins = new Set(config.http.corsAllowedOrigins);
  }

  use(request: Request, response: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(request.method)) return next();

    const origin = request.get('origin');
    const fetchSite = request.get('sec-fetch-site');
    const crossSite = fetchSite === 'cross-site';
    const untrustedOrigin = origin !== undefined && !this.allowedOrigins.has(origin);

    if (crossSite || untrustedOrigin) {
      sendApiError(request, response, {
        status: HttpStatus.FORBIDDEN,
        code: API_ERROR_CODES.CSRF_REJECTED,
        message: 'Cross-site requests are not allowed.',
      });
      return;
    }
    next();
  }
}
