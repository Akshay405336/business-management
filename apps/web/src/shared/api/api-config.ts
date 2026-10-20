import { PLATFORM_CSRF_COOKIE, PLATFORM_CSRF_HEADER } from '@techwin/contracts';

export const apiConfig = {
  /**
   * Empty by default: the browser calls `/api/v1/*` on the web origin and
   * Next.js proxies to the API, keeping auth cookies first-party.
   */
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, ''),
  requestTimeoutMs: 15_000,
  csrfCookie: PLATFORM_CSRF_COOKIE,
  csrfHeader: PLATFORM_CSRF_HEADER,
  /** Web Locks name that serializes refresh-token rotation across browser tabs. */
  refreshLockName: 'techwin:platform-session-refresh',
} as const;
