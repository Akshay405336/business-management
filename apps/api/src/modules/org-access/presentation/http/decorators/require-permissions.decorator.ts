import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';

export const REQUIRE_PERMISSIONS_KEY = 'org_access_required_permissions';

/** Declares permission keys that must be satisfied by the signed-in organization member. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
