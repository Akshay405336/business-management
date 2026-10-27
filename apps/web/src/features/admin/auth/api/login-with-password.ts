import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { accessTokenStore, apiRequest } from '@/shared/api/api-client';
import type { LoginFormValues } from '../schemas/login.schema';
import type { PlatformLoginResponse } from '../types/auth.types';

/**
 * Verifies email and password. Super Admin receives a TOTP challenge cookie;
 * other roles receive a full session (refresh cookie + access token).
 */
export async function loginWithPassword(values: LoginFormValues): Promise<PlatformLoginResponse> {
  const response = await apiRequest<PlatformLoginResponse>(PLATFORM_AUTH_ROUTES.login, {
    method: 'POST',
    body: values,
  });
  if (response.status === 'authenticated') {
    accessTokenStore.set(response.accessToken);
  }
  return response;
}
