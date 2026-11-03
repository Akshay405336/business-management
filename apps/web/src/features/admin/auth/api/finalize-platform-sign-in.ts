import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
import { suppressPlatformSessionEndedFor } from '@/shared/api/session-ended';
import type { PlatformVerifyTotpResponse } from '../types/auth.types';
import {
  armPostAuthBootstrap,
  sessionSummaryFromAuthResponse,
} from '../utils/post-auth-bootstrap';

/**
 * Loads permissions while still on the public auth page, then arms bootstrap data so the
 * protected layout can render the shell without intermediate session/access loaders.
 */
export async function finalizePlatformSignIn(response: PlatformVerifyTotpResponse): Promise<void> {
  suppressPlatformSessionEndedFor(15_000);
  const { permissions, roles } = await getMyPermissions();
  armPostAuthBootstrap({
    accessToken: response.accessToken,
    admin: response.admin,
    session: sessionSummaryFromAuthResponse(response),
    permissions,
    roles,
  });
}
