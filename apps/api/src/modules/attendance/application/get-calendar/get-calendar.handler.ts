import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceCalendarResponse } from '@techwin/contracts';
import type { AttendanceCalendarQuery } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetAttendanceCalendarHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: AttendanceCalendarQuery,
  ): Promise<AttendanceCalendarResponse> {
    await this.authz.assertPermission(actor, 'attendance.view_all');
    return this.repository.getCalendarSummary(actor.organizationId, query);
  }
}
