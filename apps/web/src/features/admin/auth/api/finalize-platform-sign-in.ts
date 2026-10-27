import { getMyPermissions } from '@/features/admin/org-access/api/org-access';
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
  const { permissions } = await getMyPermissions();
  armPostAuthBootstrap({
    accessToken: response.accessToken,
    admin: response.admin,
    session: sessionSummaryFromAuthResponse(response),
    permissions,
  });
}
