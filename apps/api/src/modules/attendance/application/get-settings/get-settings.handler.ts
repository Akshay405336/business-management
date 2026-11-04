import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceSettingsResponse } from '@techwin/contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetAttendanceSettingsHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor): Promise<AttendanceSettingsResponse> {
    const effective = await this.authz.resolveEffective(actor);
    const canRead =
      actor.isPlatformSuperAdmin ||
      effective.has('attendance.manage_settings') ||
      effective.has('calendar.view') ||
      effective.has('attendance.view_own');
    if (!canRead) {
      await this.authz.requireEmployeeId(actor);
    }
    return this.repository.getSettings(actor.organizationId);
  }
}
