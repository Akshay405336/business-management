import { Inject, Injectable } from '@nestjs/common';
import { API_PREFIX, PLATFORM_CSRF_COOKIE, PLATFORM_CSRF_HEADER } from '@techwin/contracts';
import type { CookieOptions, Request, Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../../../../config/app-config.js';

export const PLATFORM_REFRESH_COOKIE = 'tw_platform_rt';
export const PLATFORM_CHALLENGE_COOKIE = 'tw_platform_ch';

/** The refresh cookie is only ever sent to the platform-auth endpoints. */
const AUTH_COOKIE_PATH = `${API_PREFIX}/auth/platform`;
const CHALLENGE_COOKIE_PATH = `${AUTH_COOKIE_PATH}/verify-totp`;
const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

@Injectable()
export class PlatformAuthCookies {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  setChallenge(response: Response, token: string, expiresAt: Date): void {
    response.cookie(
      PLATFORM_CHALLENGE_COOKIE,
      token,
      this.httpOnly(CHALLENGE_COOKIE_PATH, expiresAt),
    );
  }

  clearChallenge(response: Response): void {
    response.clearCookie(PLATFORM_CHALLENGE_COOKIE, this.httpOnly(CHALLENGE_COOKIE_PATH));
  }

  setSession(
    response: Response,
    session: { refreshToken: string; refreshTokenExpiresAt: Date; csrfToken: string },
  ): void {
    response.cookie(
      PLATFORM_REFRESH_COOKIE,
      session.refreshToken,
      this.httpOnly(AUTH_COOKIE_PATH, session.refreshTokenExpiresAt),
    );
    // Readable by the web app so it can echo the value in the CSRF header.
    response.cookie(PLATFORM_CSRF_COOKIE, session.csrfToken, {
      ...this.base('/'),
      httpOnly: false,
      expires: session.refreshTokenExpiresAt,
    });
  }

  clearSession(response: Response): void {
    response.clearCookie(PLATFORM_REFRESH_COOKIE, this.httpOnly(AUTH_COOKIE_PATH));
    response.clearCookie(PLATFORM_CSRF_COOKIE, { ...this.base('/'), httpOnly: false });
  }

  readRefreshToken(request: Request): string | null {
    return readOpaque(cookiesOf(request)[PLATFORM_REFRESH_COOKIE]);
  }

  readChallengeToken(request: Request): string | null {
    return readOpaque(cookiesOf(request)[PLATFORM_CHALLENGE_COOKIE]);
  }

  readCsrfHeader(request: Request): string | null {
    return readOpaque(request.get(PLATFORM_CSRF_HEADER));
  }

  private base(path: string): CookieOptions {
    return { path, sameSite: 'strict', secure: this.config.cookies.secure };
  }

  private httpOnly(path: string, expires?: Date): CookieOptions {
    return { ...this.base(path), httpOnly: true, ...(expires ? { expires } : {}) };
  }
}

const cookiesOf = (request: Request): Record<string, unknown> =>
  (request.cookies as Record<string, unknown> | undefined) ?? {};

const readOpaque = (value: unknown): string | null =>
  typeof value === 'string' && OPAQUE_TOKEN_PATTERN.test(value) ? value : null;
