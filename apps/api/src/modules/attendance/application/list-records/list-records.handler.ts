import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceListResponse } from '@techwin/contracts';
import type { AttendanceListQuery } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { ReconcileDailyAttendanceHandler } from '../reconcile-daily-attendance/reconcile-daily-attendance.handler.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class ListAttendanceRecordsHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
    @Inject(ReconcileDailyAttendanceHandler) private readonly reconcile: ReconcileDailyAttendanceHandler,
  ) {}

  async execute(actor: OrgAccessActor, query: AttendanceListQuery): Promise<AttendanceListResponse> {
    await this.authz.assertPermission(actor, 'attendance.view_all');
    if (query.date) {
      await this.reconcile.execute(actor.organizationId, query.date);
    }
    return this.repository.listRecords(actor.organizationId, query);
  }
}
