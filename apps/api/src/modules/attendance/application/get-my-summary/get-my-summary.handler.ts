import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceSummaryResponse } from '@techwin/contracts';
import type { AttendanceSummaryQuery } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetMyAttendanceSummaryHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: AttendanceSummaryQuery,
  ): Promise<AttendanceSummaryResponse> {
    await this.authz.assertPermission(actor, 'attendance.view_summary');
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.getMySummary(actor.organizationId, employeeId, query);
  }
}
