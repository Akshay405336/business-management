import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceRecordItem } from '@techwin/contracts';
import type { PunchAttendanceRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

export type PunchOutCommand = {
  readonly actor: OrgAccessActor;
  readonly input: PunchAttendanceRequest;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly now: Date;
};

@Injectable()
export class PunchOutHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(command: PunchOutCommand): Promise<AttendanceRecordItem> {
    await this.authz.assertPermission(command.actor, 'attendance.punch_out');
    const employeeId = await this.authz.requireEmployeeId(command.actor);
    return this.repository.punchOut({
      organizationId: command.actor.organizationId,
      employeeId,
      adminId: command.actor.adminId,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
      deviceKey: command.input.deviceKey,
      idempotencyKey: command.input.idempotencyKey,
      now: command.now,
    });
  }
}
