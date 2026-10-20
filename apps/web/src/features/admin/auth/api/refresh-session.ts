import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import {
  accessTokenStore,
  apiRequest,
  hasCsrfCookie,
  type RefreshOutcome,
} from '@/shared/api/api-client';
import { isApiError } from '@/shared/api/api-error';
import type { PlatformRefreshResponse } from '../types/auth.types';

/**
 * Rotates the refresh cookie and stores the new access token in memory.
 * Network failures are re-thrown: they do not prove the session has ended.
 */
export async function refreshSession(): Promise<RefreshOutcome> {
  // Without the CSRF cookie the refresh cannot succeed; skip the round trip.
  if (!hasCsrfCookie()) {
    accessTokenStore.clear();
    return 'unauthenticated';
  }
  try {
    const response = await apiRequest<PlatformRefreshResponse>(PLATFORM_AUTH_ROUTES.refresh, {
      method: 'POST',
      csrf: true,
    });
    accessTokenStore.set(response.accessToken);
    return 'refreshed';
  } catch (error) {
    if (
      isApiError(error) &&
      error.kind === 'http' &&
      (error.status === 401 || error.status === 403)
    ) {
      accessTokenStore.clear();
      return 'unauthenticated';
    }
    throw error;
  }
}
