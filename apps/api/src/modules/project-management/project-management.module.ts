import { Module } from '@nestjs/common';
import { DailyTasksModule } from './modules/daily-tasks/daily-tasks.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { TaskCalendarModule } from './modules/task-calendar/task-calendar.module.js';

/** Composes Daily Tasks, Projects, and Task Calendar under one parent module. */
@Module({
  imports: [DailyTasksModule, ProjectsModule, TaskCalendarModule],
  exports: [DailyTasksModule, ProjectsModule, TaskCalendarModule],
})
export class ProjectManagementModule {}
