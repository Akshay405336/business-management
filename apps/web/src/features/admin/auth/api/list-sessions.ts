import { PLATFORM_AUTH_ROUTES } from '@techwin/contracts';
import { apiRequest } from '@/shared/api/api-client';
import type { PlatformSessionListResponse } from '../types/auth.types';

export function listSessions(signal?: AbortSignal): Promise<PlatformSessionListResponse> {
  return apiRequest<PlatformSessionListResponse>(PLATFORM_AUTH_ROUTES.sessions, {
    auth: true,
    ...(signal ? { signal } : {}),
  });
}

export function revokeSession(sessionId: string): Promise<void> {
  return apiRequest<void>(`${PLATFORM_AUTH_ROUTES.sessions}/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    auth: true,
  });
}
