import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceListResponse } from '@techwin/contracts';
import type { AttendanceHistoryQuery } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetMyAttendanceHistoryHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: AttendanceHistoryQuery,
  ): Promise<AttendanceListResponse> {
    await this.authz.assertPermission(actor, 'attendance.view_own');
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.listMyHistory(actor.organizationId, employeeId, query);
  }
}
