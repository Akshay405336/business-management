import { Inject, Injectable } from '@nestjs/common';
import {
  ATTENDANCE_REPOSITORY,
  type AttendanceRepository,
} from '../../domain/repositories/attendance.repository.js';

/** Coordinates one organization-date reconciliation. Rules live in the domain policy. */
@Injectable()
export class ReconcileDailyAttendanceHandler {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendance: AttendanceRepository,
  ) {}

  execute(organizationId: string, attendanceDate: string, now = new Date()): Promise<number> {
    return this.attendance.reconcileOrganizationDate(organizationId, attendanceDate, now);
  }
}
