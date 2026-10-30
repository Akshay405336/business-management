import { accessTokenStore, refreshAccessToken } from '@/shared/api/api-client';
import { apiConfig } from '@/shared/api/api-config';
import { readCookie } from '@/shared/lib/cookies';

const MAX_CACHE_ENTRIES = 128;

const blobUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/** API paths that require a bearer token (plain `<img src>` cannot load them). */
export function requiresAuthorizedImageFetch(resolved: string): boolean {
  if (resolved.startsWith('blob:')) return false;
  try {
    const path = resolved.startsWith('http')
      ? new URL(resolved).pathname
      : (resolved.split('?')[0] ?? resolved);
    return (
      path.includes('/media/objects/') ||
      path.includes('/employees/profile-images/') ||
      path.includes('/employees/profile-stored-objects/')
    );
  } catch {
    return false;
  }
}

export function peekAuthorizedImageBlobUrl(resolved: string): string | null {
  return blobUrlCache.get(resolved) ?? null;
}

function trimCache(): void {
  while (blobUrlCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = blobUrlCache.keys().next().value;
    if (!oldestKey) break;
    const url = blobUrlCache.get(oldestKey);
    blobUrlCache.delete(oldestKey);
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

async function fetchWithAuth(resolved: string, signal: AbortSignal): Promise<Blob> {
  if (!accessTokenStore.get()) {
    await refreshAccessToken();
  }
  const headers = new Headers();
  const token = accessTokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = readCookie(apiConfig.csrfCookie);
  if (csrf) headers.set(apiConfig.csrfHeader, csrf);

  let response = await fetch(resolved, {
    headers,
    credentials: 'include',
    signal,
    cache: 'default',
    redirect: 'manual',
  });

  if (
    response.status === 301 ||
    response.status === 302 ||
    response.status === 307 ||
    response.status === 308
  ) {
    const location = response.headers.get('Location');
    if (location) {
      response = await fetch(location, { signal, cache: 'default' });
    }
  }

  if (response.status === 401) {
    const outcome = await refreshAccessToken();
    if (outcome === 'refreshed' && accessTokenStore.get()) {
      const retryHeaders = new Headers(headers);
      const retryToken = accessTokenStore.get();
      if (retryToken) retryHeaders.set('Authorization', `Bearer ${retryToken}`);
      response = await fetch(resolved, {
        headers: retryHeaders,
        credentials: 'include',
        signal,
        cache: 'default',
        redirect: 'manual',
      });
      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 307 ||
        response.status === 308
      ) {
        const location = response.headers.get('Location');
        if (location) {
          response = await fetch(location, { signal, cache: 'default' });
        }
      }
    }
  }

  if (!response.ok) {
    throw new Error('Image request failed.');
  }
  return response.blob();
}

/** Loads an authorized image once; reuses blob URLs and dedupes concurrent requests. */
export function loadAuthorizedImageBlobUrl(
  resolved: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  const cached = blobUrlCache.get(resolved);
  if (cached) return Promise.resolve(cached);

  let pending = inflight.get(resolved);
  if (!pending) {
    pending = fetchWithAuth(resolved, new AbortController().signal)
      .then((blob) => {
        const existing = blobUrlCache.get(resolved);
        if (existing) return existing;
        const url = URL.createObjectURL(blob);
        blobUrlCache.delete(resolved);
        blobUrlCache.set(resolved, url);
        trimCache();
        inflight.delete(resolved);
        return url;
      })
      .catch((error) => {
        inflight.delete(resolved);
        throw error;
      });
    inflight.set(resolved, pending);
  }

  return pending.then((url) => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    return url;
  });
}
