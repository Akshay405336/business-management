import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { PrismaDailyTaskRepository } from './infrastructure/persistence/prisma-daily-task.repository.js';
import { DailyTasksController } from './presentation/http/controllers/daily-tasks.controller.js';
import { DailyTaskExceptionFilter } from './presentation/http/filters/daily-task-exception.filter.js';

@Module({
  imports: [DatabaseModule, AuthModule, CrmModule, OrgAccessModule],
  controllers: [DailyTasksController],
  providers: [PrismaDailyTaskRepository, DailyTaskExceptionFilter],
})
export class DailyTasksModule {}
