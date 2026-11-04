import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceRecordDetail } from '@techwin/contracts';
import type { CorrectAttendanceRecordRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class CorrectAttendanceRecordHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    recordId: string,
    input: CorrectAttendanceRecordRequest,
  ): Promise<AttendanceRecordDetail> {
    await this.authz.assertPermission(actor, 'attendance.correct_records');
    return this.repository.correctRecord(actor.organizationId, actor.adminId, recordId, input);
  }
}
