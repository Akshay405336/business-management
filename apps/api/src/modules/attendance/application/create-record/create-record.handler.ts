import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceRecordDetail } from '@techwin/contracts';
import type { CreateAttendanceRecordRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class CreateAttendanceRecordHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: CreateAttendanceRecordRequest,
  ): Promise<AttendanceRecordDetail> {
    await this.authz.assertPermission(actor, 'attendance.correct_records');
    return this.repository.createManualRecord(actor.organizationId, actor.adminId, input);
  }
}
