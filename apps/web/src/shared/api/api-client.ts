import { API_ERROR_CODES, type ApiErrorCode } from '@techwin/contracts';
import { readCookie } from '@/shared/lib/cookies';
import { apiConfig } from './api-config';
import { ApiError } from './api-error';
import { accessTokenStore } from './access-token-store';
import { shouldNotifySessionEnded, shouldSuppressSessionEnded } from './session-ended';

export { accessTokenStore } from './access-token-store';

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
type AccessDeniedListener = (error: ApiError) => void;

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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

const SESSION_RUNTIME_KEY = '__techwinPlatformSessionRuntime';

type SessionRuntime = {
  refresher: SessionRefresher | null;
  inFlight: Promise<RefreshOutcome> | null;
  sessionEndedListeners: Set<SessionEndedListener>;
  accessDeniedListeners: Set<AccessDeniedListener>;
};

function sessionRuntime(): SessionRuntime {
  const globalRecord = globalThis as typeof globalThis & {
    [SESSION_RUNTIME_KEY]?: SessionRuntime;
  };
  globalRecord[SESSION_RUNTIME_KEY] ??= {
    refresher: null,
    inFlight: null,
    sessionEndedListeners: new Set(),
    accessDeniedListeners: new Set(),
  };
  return globalRecord[SESSION_RUNTIME_KEY];
}

const ACCESS_DENIED_CODES: ReadonlySet<ApiErrorCode | null> = new Set([
  API_ERROR_CODES.FORBIDDEN,
  API_ERROR_CODES.MEMBERSHIP_DENIED,
]);

export function hasCsrfCookie(): boolean {
  return readCookie(apiConfig.csrfCookie) !== null;
}

/** Registers the feature-level function that performs a refresh-token rotation. */
export function registerSessionRefresher(refresher: SessionRefresher | null): void {
  sessionRuntime().refresher = refresher;
}

/** Notified when the session is definitively gone (refresh rejected). */
export function onSessionEnded(listener: SessionEndedListener): () => void {
  const listeners = sessionRuntime().sessionEndedListeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Notified when an authenticated request is rejected with 403 (permissions may have changed). */
export function onAccessDenied(listener: AccessDeniedListener): () => void {
  const listeners = sessionRuntime().accessDeniedListeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyAccessDenied(error: ApiError): void {
  if (error.status !== 403 || !ACCESS_DENIED_CODES.has(error.code)) return;
  for (const listener of sessionRuntime().accessDeniedListeners) listener(error);
}

function notifySessionEnded(): void {
  if (shouldSuppressSessionEnded()) return;
  accessTokenStore.clear();
  for (const listener of sessionRuntime().sessionEndedListeners) listener();
}

async function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(apiConfig.refreshLockName, task);
  }
  return task();
}

/** Single-flight refresh shared by every caller in this tab (and across chunk copies). */
export function refreshAccessToken(): Promise<RefreshOutcome> {
  const state = sessionRuntime();
  if (!state.refresher) return Promise.resolve('unauthenticated');
  const refresher = state.refresher;
  state.inFlight ??= withCrossTabLock(refresher)
    .then((outcome) => {
      if (outcome === 'unauthenticated') notifySessionEnded();
      return outcome;
    })
    .finally(() => {
      state.inFlight = null;
    });
  return state.inFlight;
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = accessTokenStore.get();
  if (options.auth && token) headers.set('Authorization', `Bearer ${token}`);
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
  if (response.status === 204 || response.status === 205) return undefined as T;
  const text = await response.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  // No token in memory (e.g. after a reload): restore it before the first call.
  if (options.auth && !accessTokenStore.get() && sessionRuntime().refresher) {
    const outcome = await refreshAccessToken();
    if (outcome === 'unauthenticated') {
      throw new ApiError('http', 'Your session has ended.', 401, API_ERROR_CODES.SESSION_EXPIRED);
    }
  }

  const response = await send(path, options);
  if (response.ok) return parse<T>(response);

  const error = await ApiError.fromResponse(response);
  if (!(options.auth && response.status === 401 && REFRESHABLE_CODES.has(error.code))) {
    if (options.auth && shouldNotifySessionEnded(error)) notifySessionEnded();
    if (options.auth) notifyAccessDenied(error);
    throw error;
  }

  const outcome = await refreshAccessToken();
  if (outcome === 'unauthenticated') {
    if (shouldNotifySessionEnded(error)) notifySessionEnded();
    throw error;
  }

  const retried = await send(path, options);
  if (retried.ok) return parse<T>(retried);
  const retryError = await ApiError.fromResponse(retried);
  if (retried.status === 401 && shouldNotifySessionEnded(retryError)) notifySessionEnded();
  notifyAccessDenied(retryError);
  throw retryError;
}
