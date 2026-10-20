import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { accessTokenStore, apiRequest } from '@/shared/api/api-client';
import type { PlatformLogoutAllResponse } from '../types/auth.types';

/** Revokes the current session server-side; the API also clears the cookies. */
export async function logout(): Promise<void> {
  await apiRequest<void>(PLATFORM_AUTH_ROUTES.logout, { method: 'POST', csrf: true });
  accessTokenStore.clear();
}

/** Revokes every session of the signed-in administrator, including this one. */
export async function logoutAllDevices(): Promise<PlatformLogoutAllResponse> {
  const result = await apiRequest<PlatformLogoutAllResponse>(PLATFORM_AUTH_ROUTES.logoutAll, {
    method: 'POST',
    auth: true,
  });
  accessTokenStore.clear();
  return result;
}
