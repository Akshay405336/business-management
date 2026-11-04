import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceMyTodayResponse } from '@techwin/contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetMyTodayAttendanceHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    now: Date,
    desktopSession: boolean,
  ): Promise<AttendanceMyTodayResponse> {
    await this.authz.assertPermission(actor, 'attendance.view_own');
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.getMyToday(actor.organizationId, employeeId, now, desktopSession);
  }
}
