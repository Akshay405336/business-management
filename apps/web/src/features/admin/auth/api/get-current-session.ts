import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type { PlatformCurrentSessionResponse } from '../types/auth.types';

export function getCurrentSession(signal?: AbortSignal): Promise<PlatformCurrentSessionResponse> {
  return apiRequest<PlatformCurrentSessionResponse>(PLATFORM_AUTH_ROUTES.me, {
    auth: true,
    ...(signal ? { signal } : {}),
  });
}
