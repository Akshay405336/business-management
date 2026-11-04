import type { Request } from 'express';
import { isMobileOrTabletUserAgent } from '../../domain/policies/device-eligibility.policy.js';

export function resolveClientIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return request.ip ?? null;
}

export function isDesktopSession(request: Request): boolean {
  const ua = request.headers['user-agent'];
  return !isMobileOrTabletUserAgent(typeof ua === 'string' ? ua : null);
}
