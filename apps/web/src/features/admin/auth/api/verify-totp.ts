import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { accessTokenStore, apiRequest } from '@/shared/api/api-client';
import type { TotpFormValues } from '../schemas/totp.schema';
import type { PlatformVerifyTotpResponse } from '../types/auth.types';

/** Step 2: completes sign-in. The refresh token arrives as an HttpOnly cookie. */
export async function verifyTotp(values: TotpFormValues): Promise<PlatformVerifyTotpResponse> {
  const response = await apiRequest<PlatformVerifyTotpResponse>(PLATFORM_AUTH_ROUTES.verifyTotp, {
    method: 'POST',
    body: values,
  });
  accessTokenStore.set(response.accessToken);
  return response;
}
