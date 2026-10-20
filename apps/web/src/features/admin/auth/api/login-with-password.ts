import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type { LoginFormValues } from '../schemas/login.schema';
import type { PlatformLoginResponse } from '../types/auth.types';

/** Step 1: verifies the password. The API keeps the challenge in an HttpOnly cookie. */
export function loginWithPassword(values: LoginFormValues): Promise<PlatformLoginResponse> {
  return apiRequest<PlatformLoginResponse>(PLATFORM_AUTH_ROUTES.login, {
    method: 'POST',
    body: values,
  });
}
