import type { OrgAccessActor } from '../../../application/shared/org-access-actor.js';

export function toOrgAccessActor(
  crm: { organizationId: string; adminId: string },
  isPlatformSuperAdmin: boolean,
): OrgAccessActor {
  return {
    organizationId: crm.organizationId,
    adminId: crm.adminId,
    isPlatformSuperAdmin,
  };
}
