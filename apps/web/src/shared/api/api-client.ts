import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import { readCookie } from '@/shared/lib/cookies';
import { apiConfig } from './api-config';
import { ApiError } from './api-error';

/**
 * The single HTTP entry point of the web app.
 *
 * - The access token lives only in this module's memory (never in web storage);
 *   a page reload restores it through the refresh cookie.
 * - Concurrent refreshes are collapsed into one request per tab, and the Web
 *   Locks API serializes rotation across tabs so a rotated refresh token is
 *   never replayed (which the API treats as theft).
 * - An authenticated request is retried at most once after a successful refresh.
 */

export type RefreshOutcome = 'refreshed' | 'unauthenticated';
type SessionRefresher = () => Promise<RefreshOutcome>;
type SessionEndedListener = () => void;

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'DELETE';
  readonly body?: unknown;
  /** Attach the in-memory access token and refresh it when it has expired. */
  readonly auth?: boolean;
  /** Echo the CSRF cookie for cookie-authenticated endpoints. */
  readonly csrf?: boolean;
  readonly signal?: AbortSignal;
}

/** 401 codes that a refresh can fix. Anything else is final. */
const REFRESHABLE_CODES: ReadonlySet<ApiErrorCode | null> = new Set([
  API_ERROR_CODES.ACCESS_TOKEN_INVALID,
  API_ERROR_CODES.UNAUTHENTICATED,
]);

let accessToken: string | null = null;
let sessionRefresher: SessionRefresher | null = null;
let refreshInFlight: Promise<RefreshOutcome> | null = null;
const sessionEndedListeners = new Set<SessionEndedListener>();

export const accessTokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};

export function hasCsrfCookie(): boolean {
  return readCookie(apiConfig.csrfCookie) !== null;
}

/** Registers the feature-level function that performs a refresh-token rotation. */
export function registerSessionRefresher(refresher: SessionRefresher): void {
  sessionRefresher = refresher;
}

/** Notified when the session is definitively gone (refresh rejected). */
export function onSessionEnded(listener: SessionEndedListener): () => void {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

function notifySessionEnded(): void {
  accessTokenStore.clear();
  for (const listener of sessionEndedListeners) listener();
}

async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(apiConfig.refreshLockName, task);
  }
  return task();
}

/** Single-flight refresh shared by every caller in this tab. */
export function refreshAccessToken(): Promise<RefreshOutcome> {
  const refresher = sessionRefresher;
  if (!refresher) return Promise.resolve('unauthenticated');
  refreshInFlight ??= withCrossTabLock(refresher)
    .then((outcome) => {
      if (outcome === 'unauthenticated') notifySessionEnded();
      return outcome;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (options.auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.csrf) {
    const csrfToken = readCookie(apiConfig.csrfCookie);
    if (csrfToken) headers.set(apiConfig.csrfHeader, csrfToken);
  }

  const timeout = AbortSignal.timeout(apiConfig.requestTimeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    return await fetch(`${apiConfig.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body),
      credentials: 'include',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError('timeout', 'The server took too long to respond.');
    throw new ApiError(
      'network',
      'Unable to reach the server. Check your connection and try again.',
    );
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  // No token in memory (e.g. after a reload): restore it before the first call.
  if (options.auth && !accessToken && sessionRefresher) {
    const outcome = await refreshAccessToken();
    if (outcome === 'unauthenticated') {
      throw new ApiError('http', 'Your session has ended.', 401, API_ERROR_CODES.SESSION_EXPIRED);
    }
  }

  const response = await send(path, options);
  if (response.ok) return parse<T>(response);

  const error = await ApiError.fromResponse(response);
  if (!(options.auth && response.status === 401 && REFRESHABLE_CODES.has(error.code))) {
    if (options.auth && error.code === API_ERROR_CODES.SESSION_EXPIRED) notifySessionEnded();
    throw error;
  }

  const outcome = await refreshAccessToken();
  if (outcome === 'unauthenticated') throw error;

  const retried = await send(path, options);
  if (retried.ok) return parse<T>(retried);
  const retryError = await ApiError.fromResponse(retried);
  if (retried.status === 401) notifySessionEnded();
  throw retryError;
}
