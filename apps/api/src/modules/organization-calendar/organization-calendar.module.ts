import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import {
  ClassifyOrgCalendarDateHandler,
  CreateOrgCalendarEventHandler,
  DeleteOrgCalendarEventHandler,
  DuplicateOrgCalendarHolidaysHandler,
  ExportOrgCalendarHandler,
  GetEmployeeOrgCalendarMonthHandler,
  GetOrgCalendarEventHandler,
  GetOrgCalendarMonthHandler,
  ListOrgCalendarEventsHandler,
  ListOrgCalendarHolidaysHandler,
  UpdateOrgCalendarEventHandler,
  ReplaceOrgCalendarDateClassificationHandler,
} from './application/org-calendar.handlers.js';
import { OrgCalendarAuthorizationService } from './application/services/org-calendar-authorization.service.js';
import { OrgCalendarAttendanceReconcileService } from './application/services/org-calendar-attendance-reconcile.service.js';
import { ORG_CALENDAR_REPOSITORY } from './domain/repositories/org-calendar.repository.js';
import { PrismaOrgCalendarRepository } from './infrastructure/persistence/prisma/repositories/prisma-org-calendar.repository.js';
import { OrganizationCalendarController } from './presentation/http/controllers/organization-calendar.controller.js';
import { OrgCalendarExceptionFilter } from './presentation/http/filters/org-calendar-exception.filter.js';

export const orgCalendarPersistenceProviders: Provider[] = [
  { provide: ORG_CALENDAR_REPOSITORY, useClass: PrismaOrgCalendarRepository },
];

const orgCalendarHandlers = [
  OrgCalendarAuthorizationService,
  OrgCalendarAttendanceReconcileService,
  ListOrgCalendarEventsHandler,
  GetOrgCalendarMonthHandler,
  GetEmployeeOrgCalendarMonthHandler,
  GetOrgCalendarEventHandler,
  CreateOrgCalendarEventHandler,
  UpdateOrgCalendarEventHandler,
  DeleteOrgCalendarEventHandler,
  ListOrgCalendarHolidaysHandler,
  DuplicateOrgCalendarHolidaysHandler,
  ExportOrgCalendarHandler,
  ClassifyOrgCalendarDateHandler,
  ReplaceOrgCalendarDateClassificationHandler,
] as const;

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule],
  controllers: [OrganizationCalendarController],
  providers: [...orgCalendarPersistenceProviders, ...orgCalendarHandlers, OrgCalendarExceptionFilter],
  exports: [ORG_CALENDAR_REPOSITORY, OrgCalendarExceptionFilter],
})
export class OrganizationCalendarModule {}
