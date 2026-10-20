export const API_PREFIX = '/api/v1';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Double-submit CSRF protection for cookie-authenticated platform-auth requests.
 * The API sets a readable cookie; the client echoes its value in the header.
 */
export const PLATFORM_CSRF_COOKIE = 'tw_platform_csrf';
export const PLATFORM_CSRF_HEADER = 'x-csrf-token';

export const PLATFORM_AUTH_ROUTES = {
  login: `${API_PREFIX}/auth/platform/login`,
  verifyTotp: `${API_PREFIX}/auth/platform/verify-totp`,
  refresh: `${API_PREFIX}/auth/platform/refresh`,
  me: `${API_PREFIX}/auth/platform/me`,
  logout: `${API_PREFIX}/auth/platform/logout`,
  logoutAll: `${API_PREFIX}/auth/platform/logout-all`,
  sessions: `${API_PREFIX}/auth/platform/sessions`,
} as const;
