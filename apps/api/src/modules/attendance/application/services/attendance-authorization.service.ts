import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey } from '@techwin/contracts';
import {
  PermissionCheckerService,
  type OrgAccessActor,
} from '../../../org-access/index.js';
import { AttendanceForbiddenError } from '../../domain/errors/attendance.errors.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';

@Injectable()
export class AttendanceAuthorizationService {
  constructor(
    @Inject(PermissionCheckerService) private readonly permissions: PermissionCheckerService,
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepository,
  ) {}

  async resolveEffective(actor: OrgAccessActor): Promise<ReadonlySet<PermissionKey>> {
    const keys = await this.permissions.resolveEffectivePermissions(actor);
    return new Set(keys);
  }

  async assertPermission(actor: OrgAccessActor, key: PermissionKey): Promise<void> {
    const effective = await this.resolveEffective(actor);
    if (actor.isPlatformSuperAdmin || effective.has(key)) return;
    throw new AttendanceForbiddenError();
  }

  async requireEmployeeId(actor: OrgAccessActor): Promise<string> {
    const employeeId = await this.attendance.resolveEmployeeId(actor.organizationId, actor.adminId);
    if (!employeeId) {
      throw new AttendanceForbiddenError('No active employee profile is linked to your account.');
    }
    return employeeId;
  }
}
