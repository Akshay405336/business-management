import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../../infrastructure/database/database.module.js';
import { AuthModule } from '../../../auth/index.js';
import { CrmModule } from '../../../crm/index.js';
import { EmployeesModule } from '../../../employees/index.js';
import { OrgAccessModule } from '../../../org-access/index.js';
import { DailyTasksModule } from '../daily-tasks/daily-tasks.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { ListCalendarFiltersHandler } from './application/list-calendar-filters/list-calendar-filters.handler.js';
import { ListCalendarTasksHandler } from './application/list-calendar-tasks/list-calendar-tasks.handler.js';
import { ORG_TASK_CALENDAR_DATA } from './application/integration/org-task-calendar-data.port.js';
import { OrgTaskCalendarDataAdapter } from './infrastructure/integration/org-task-calendar-data.adapter.js';
import { TaskCalendarController } from './presentation/http/controllers/task-calendar.controller.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CrmModule,
    OrgAccessModule,
    EmployeesModule,
    DailyTasksModule,
    ProjectsModule,
  ],
  controllers: [TaskCalendarController],
  providers: [
    ListCalendarTasksHandler,
    ListCalendarFiltersHandler,
    { provide: ORG_TASK_CALENDAR_DATA, useClass: OrgTaskCalendarDataAdapter },
  ],
})
export class TaskCalendarModule {}
