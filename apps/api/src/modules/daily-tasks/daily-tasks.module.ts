import { Module, type Provider } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { CreateDailyTaskHandler } from './application/create-daily-task/create-daily-task.handler.js';
import { DeleteDailyTaskHandler } from './application/delete-daily-task/delete-daily-task.handler.js';
import { GetDailyTaskBoardHandler } from './application/get-daily-task-board/get-daily-task-board.handler.js';
import { GetDailyTaskHandler } from './application/get-daily-task/get-daily-task.handler.js';
import { ListDailyTasksHandler } from './application/list-daily-tasks/list-daily-tasks.handler.js';
import { ListMyDailyTasksHandler } from './application/list-my-daily-tasks/list-my-daily-tasks.handler.js';
import { ListWorkflowStagesHandler } from './application/list-workflow-stages/list-workflow-stages.handler.js';
import { MoveDailyTaskStageHandler } from './application/move-daily-task-stage/move-daily-task-stage.handler.js';
import { RescheduleDailyTaskHandler } from './application/reschedule-daily-task/reschedule-daily-task.handler.js';
import { UpdateDailyTaskHandler } from './application/update-daily-task/update-daily-task.handler.js';
import { UpdateWorkflowStagesHandler } from './application/update-workflow-stages/update-workflow-stages.handler.js';
import { DAILY_TASK_REPOSITORY } from './domain/repositories/daily-task.repository.js';
import { PrismaDailyTaskRepository } from './infrastructure/persistence/prisma/repositories/prisma-daily-task.repository.js';
import { DailyTasksController } from './presentation/http/controllers/daily-tasks.controller.js';
import { DailyTaskExceptionFilter } from './presentation/http/filters/daily-task-exception.filter.js';

export const dailyTaskPersistenceProviders: Provider[] = [
  { provide: DAILY_TASK_REPOSITORY, useClass: PrismaDailyTaskRepository },
];

const dailyTaskUseCaseHandlers = [
  CreateDailyTaskHandler,
  DeleteDailyTaskHandler,
  GetDailyTaskBoardHandler,
  GetDailyTaskHandler,
  ListDailyTasksHandler,
  ListMyDailyTasksHandler,
  ListWorkflowStagesHandler,
  MoveDailyTaskStageHandler,
  RescheduleDailyTaskHandler,
  UpdateDailyTaskHandler,
  UpdateWorkflowStagesHandler,
] as const;

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule],
  controllers: [DailyTasksController],
  providers: [
    ...dailyTaskPersistenceProviders,
    ...dailyTaskUseCaseHandlers,
    DailyTaskExceptionFilter,
  ],
  exports: [DAILY_TASK_REPOSITORY, DailyTaskExceptionFilter],
})
export class DailyTasksModule {}
