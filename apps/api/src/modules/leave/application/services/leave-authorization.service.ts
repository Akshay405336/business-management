import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';
import {
  PermissionCheckerService,
  type OrgAccessActor,
} from '../../../org-access/index.js';
import { LeaveForbiddenError } from '../../domain/errors/leave.errors.js';
import {
  LEAVE_REPOSITORY,
  type LeaveRepository,
} from '../../domain/repositories/leave.repository.js';

@Injectable()
export class LeaveAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(LEAVE_REPOSITORY) private readonly leave: LeaveRepository,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  async requireAnyPermission(actor: OrgAccessActor, keys: readonly PermissionKey[]): Promise<void> {
    if (actor.isPlatformSuperAdmin) return;
    const effective = await this.resolveEffective(actor);
    if (keys.some((key) => effective.has(key))) return;
    throw new LeaveForbiddenError();
  }

  async requireEmployeeId(actor: OrgAccessActor): Promise<string> {
    const employeeId = await this.leave.resolveEmployeeId(actor.organizationId, actor.adminId);
    if (!employeeId) {
      throw new LeaveForbiddenError('No active employee profile is linked to your account.');
    }
    return employeeId;
  }

  async hasPermission(actor: OrgAccessActor, key: PermissionKey): Promise<boolean> {
    if (actor.isPlatformSuperAdmin) return true;
    const effective = await this.resolveEffective(actor);
    return effective.has(key);
  }
}
