import { Inject, Injectable } from '@nestjs/common';
import type { AttendanceDeviceItem } from '@techwin/contracts';
import type { RegisterAttendanceDeviceRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';
import { AttendanceAuthorizationService } from '../services/attendance-authorization.service.js';

@Injectable()
export class ListAttendanceDevicesHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor): Promise<readonly AttendanceDeviceItem[]> {
    await this.authz.assertPermission(actor, 'attendance.manage_devices');
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.listDevices(actor.organizationId, employeeId);
  }
}

@Injectable()
export class RegisterAttendanceDeviceHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: RegisterAttendanceDeviceRequest,
    userAgent: string | null,
  ): Promise<AttendanceDeviceItem> {
    await this.authz.assertPermission(actor, 'attendance.manage_devices');
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.registerDevice(
      actor.organizationId,
      employeeId,
      actor.adminId,
      userAgent,
      input,
    );
  }
}

@Injectable()
export class RevokeAttendanceDeviceHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly repository: AttendanceRepository,
    @Inject(AttendanceAuthorizationService) private readonly authz: AttendanceAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, deviceId: string): Promise<void> {
    await this.authz.assertPermission(actor, 'attendance.manage_devices');
    const employeeId = await this.authz.requireEmployeeId(actor);
    await this.repository.revokeDevice(actor.organizationId, employeeId, deviceId);
  }
}
