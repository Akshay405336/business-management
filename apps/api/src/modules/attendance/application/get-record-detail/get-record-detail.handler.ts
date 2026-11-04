import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceRecordDetail } from '@techwin/contracts';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class GetAttendanceRecordDetailHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, recordId: string): Promise<AttendanceRecordDetail> {
    await this.authz.assertPermission(actor, 'attendance.view_all');
    return this.repository.getRecordDetail(actor.organizationId, recordId);
  }
}
