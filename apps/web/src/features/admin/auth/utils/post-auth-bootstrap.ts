import type {
  PermissionKey,
  PlatformAdminProfile,
  PlatformSessionSummary,
  PlatformVerifyTotpResponse,
} from '@techwin/contracts';
import { accessTokenStore } from '@/shared/api/access-token-store';
import { suppressPlatformSessionEndedFor } from '@/shared/api/session-ended';

export type PostAuthBootstrap = {
  readonly accessToken: string;
  readonly admin: PlatformAdminProfile;
  readonly session: PlatformSessionSummary;
  readonly permissions: readonly PermissionKey[];
};

let armed: PostAuthBootstrap | null = null;

/** Arms in-memory session + permissions for the next protected layout mount (same tab, before navigation). */
export function armPostAuthBootstrap(data: PostAuthBootstrap): void {
  armed = data;
  accessTokenStore.set(data.accessToken);
  suppressPlatformSessionEndedFor(15_000);
}

export function readPostAuthBootstrap(): PostAuthBootstrap | null {
  return armed;
}

export function clearPostAuthBootstrap(): void {
  armed = null;
}

/** Ensures the bearer token from sign-in is on the shared store before `/me` runs. */
export function hydrateAccessTokenFromBootstrap(): void {
  const bootstrap = readPostAuthBootstrap();
  if (bootstrap?.accessToken) accessTokenStore.set(bootstrap.accessToken);
}

/** Builds a session summary from login/TOTP token response until `/me` returns authoritative fields. */
export function sessionSummaryFromAuthResponse(
  response: PlatformVerifyTotpResponse,
): PlatformSessionSummary {
  const now = new Date().toISOString();
  return {
    id: response.sessionId,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: response.sessionExpiresAt,
    ipAddress: null,
    userAgent: null,
    current: true,
  };
}
