import { PLATFORM_CSRF_COOKIE, PLATFORM_CSRF_HEADER } from '@techwin/contracts';

const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

/**
 * Browser calls must stay on the web origin so `SameSite=Strict` auth cookies
 * remain first-party. A loopback `NEXT_PUBLIC_API_BASE_URL` on another port
 * (e.g. :4000 while the app is on :3000) is same-site but cross-origin: the
 * CSRF cookie cannot be read from `document.cookie` and refresh never works.
 * Next.js already rewrites `/api/v1/*` to the API, so the browser can stay
 * same-origin in that case.
 */
export function resolveApiBaseUrl(): string {
  if (!configuredApiBaseUrl) return '';
  if (typeof window === 'undefined') return configuredApiBaseUrl;
  try {
    const api = new URL(configuredApiBaseUrl, window.location.href);
    if (api.origin === window.location.origin) return configuredApiBaseUrl;
    if (isLoopbackHost(api.hostname) && isLoopbackHost(window.location.hostname)) return '';
  } catch {
    return configuredApiBaseUrl;
  }
  return configuredApiBaseUrl;
}

export const apiConfig = {
  get baseUrl(): string {
    return resolveApiBaseUrl();
  },
  requestTimeoutMs: 15_000,
  csrfCookie: PLATFORM_CSRF_COOKIE,
  csrfHeader: PLATFORM_CSRF_HEADER,
  /** Web Locks name that serializes refresh-token rotation across browser tabs. */
  refreshLockName: 'techwin:platform-session-refresh',
} as const;
