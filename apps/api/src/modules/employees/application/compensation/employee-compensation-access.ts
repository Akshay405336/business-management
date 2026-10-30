import type { PermissionKey } from '@techwin/contracts';
import { PermissionCheckerService } from '../../../org-access/application/services/permission-checker.service.js';
import type { OrgAccessActor } from '../../../org-access/application/access/org-access-actor.js';
import { OrgAccessForbiddenError } from '../../../org-access/domain/errors/org-access.errors.js';

const COMPENSATION_READ: PermissionKey = 'employees.compensation.read';
const COMPENSATION_MANAGE: PermissionKey = 'employees.compensation.manage';

export async function canReadEmployeeCompensation(
  checker: PermissionCheckerService,
  actor: OrgAccessActor,
): Promise<boolean> {
  return checker.hasAllPermissions(actor, [COMPENSATION_READ]);
}

export async function assertCanManageEmployeeCompensation(
  checker: PermissionCheckerService,
  actor: OrgAccessActor,
): Promise<void> {
  const allowed = await checker.hasAllPermissions(actor, [COMPENSATION_MANAGE]);
  if (!allowed) {
    throw new OrgAccessForbiddenError('You do not have permission to manage employee compensation.');
  }
}
