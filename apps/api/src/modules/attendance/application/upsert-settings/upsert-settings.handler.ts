import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceSettingsResponse } from '@techwin/contracts';
import type { UpsertAttendanceSettingsRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class UpsertAttendanceSettingsHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: UpsertAttendanceSettingsRequest,
  ): Promise<AttendanceSettingsResponse> {
    await this.authz.assertPermission(actor, 'attendance.manage_settings');
    return this.repository.upsertSettings(actor.organizationId, actor.adminId, input);
  }
}
