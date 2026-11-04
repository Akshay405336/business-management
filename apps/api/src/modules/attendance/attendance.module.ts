import { Module, type Provider } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { OrganizationCalendarModule } from '../organization-calendar/index.js';
import { CreateAttendanceRecordHandler } from './application/create-record/create-record.handler.js';
import { CorrectAttendanceRecordHandler } from './application/correct-record/correct-record.handler.js';
import { GetAttendanceCalendarHandler } from './application/get-calendar/get-calendar.handler.js';
import {
  ListAttendanceDevicesHandler,
  RegisterAttendanceDeviceHandler,
  RevokeAttendanceDeviceHandler,
} from './application/devices/attendance-devices.handlers.js';
import { GetAttendanceRecordDetailHandler } from './application/get-record-detail/get-record-detail.handler.js';
import { GetMyAttendanceHistoryHandler } from './application/get-my-history/get-my-history.handler.js';
import { GetMyAttendanceSummaryHandler } from './application/get-my-summary/get-my-summary.handler.js';
import { GetMyTodayAttendanceHandler } from './application/get-my-today/get-my-today.handler.js';
import { GetAttendanceSettingsHandler } from './application/get-settings/get-settings.handler.js';
import { ListAttendanceRecordsHandler } from './application/list-records/list-records.handler.js';
import { PunchInHandler } from './application/punch-in/punch-in.handler.js';
import { PunchOutHandler } from './application/punch-out/punch-out.handler.js';
import { AttendanceAuthorizationService } from './application/services/attendance-authorization.service.js';
import { UpsertAttendanceSettingsHandler } from './application/upsert-settings/upsert-settings.handler.js';
import { ATTENDANCE_REPOSITORY } from './domain/repositories/attendance.repository.js';
import { AttendanceJobRunner } from './infrastructure/jobs/attendance-job-runner.service.js';
import { PrismaAttendanceRepository } from './infrastructure/persistence/prisma/repositories/prisma-attendance.repository.js';
import { AttendanceController } from './presentation/http/controllers/attendance.controller.js';
import { AttendanceExceptionFilter } from './presentation/http/filters/attendance-exception.filter.js';
import { AttendanceSelfServiceGuard } from './presentation/http/guards/attendance-self-service.guard.js';

export const attendancePersistenceProviders: Provider[] = [
  { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceRepository },
];

const attendanceHandlers = [
  AttendanceAuthorizationService,
  PunchInHandler,
  PunchOutHandler,
  GetMyTodayAttendanceHandler,
  GetMyAttendanceHistoryHandler,
  GetMyAttendanceSummaryHandler,
  GetAttendanceSettingsHandler,
  UpsertAttendanceSettingsHandler,
  ListAttendanceRecordsHandler,
  GetAttendanceCalendarHandler,
  GetAttendanceRecordDetailHandler,
  CreateAttendanceRecordHandler,
  CorrectAttendanceRecordHandler,
  ListAttendanceDevicesHandler,
  RegisterAttendanceDeviceHandler,
  RevokeAttendanceDeviceHandler,
  AttendanceJobRunner,
] as const;

@Module({
  imports: [DatabaseModule, CacheModule, AuthModule, CrmModule, OrgAccessModule, OrganizationCalendarModule],
  controllers: [AttendanceController],
  providers: [
    ...attendancePersistenceProviders,
    ...attendanceHandlers,
    AttendanceExceptionFilter,
    AttendanceSelfServiceGuard,
  ],
  exports: [ATTENDANCE_REPOSITORY, AttendanceExceptionFilter],
})
export class AttendanceModule {}
