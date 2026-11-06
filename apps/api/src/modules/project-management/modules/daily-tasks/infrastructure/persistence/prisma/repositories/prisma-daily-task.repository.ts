import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../../../../infrastructure/database/prisma.service.js';
import type { DailyTaskRepository } from '../../../../domain/repositories/daily-task.repository.js';
import { DailyTaskPrismaStore } from '../stores/daily-task-prisma.store.js';

/** Thin Nest adapter over {@link DailyTaskPrismaStore} (CRM-style persistence split). */
@Injectable()
export class PrismaDailyTaskRepository implements DailyTaskRepository {
  private readonly store: DailyTaskPrismaStore;

  constructor(prisma: PrismaService) {
    this.store = new DailyTaskPrismaStore(prisma);
  }

  listWorkflowStages(...args: Parameters<DailyTaskPrismaStore['listWorkflowStages']>) {
    return this.store.listWorkflowStages(...args);
  }

  replaceWorkflowStages(...args: Parameters<DailyTaskPrismaStore['replaceWorkflowStages']>) {
    return this.store.replaceWorkflowStages(...args);
  }

  getBoard(...args: Parameters<DailyTaskPrismaStore['getBoard']>) {
    return this.store.getBoard(...args);
  }

  listTasks(...args: Parameters<DailyTaskPrismaStore['listTasks']>) {
    return this.store.listTasks(...args);
  }

  listMyTasks(...args: Parameters<DailyTaskPrismaStore['listMyTasks']>) {
    return this.store.listMyTasks(...args);
  }

  getTask(...args: Parameters<DailyTaskPrismaStore['getTask']>) {
    return this.store.getTask(...args);
  }

  createTask(...args: Parameters<DailyTaskPrismaStore['createTask']>) {
    return this.store.createTask(...args);
  }

  updateTask(...args: Parameters<DailyTaskPrismaStore['updateTask']>) {
    return this.store.updateTask(...args);
  }

  moveTaskStage(...args: Parameters<DailyTaskPrismaStore['moveTaskStage']>) {
    return this.store.moveTaskStage(...args);
  }

  rescheduleTask(...args: Parameters<DailyTaskPrismaStore['rescheduleTask']>) {
    return this.store.rescheduleTask(...args);
  }

  deleteTask(...args: Parameters<DailyTaskPrismaStore['deleteTask']>) {
    return this.store.deleteTask(...args);
  }

  isTaskAssignedToAdmin(...args: Parameters<DailyTaskPrismaStore['isTaskAssignedToAdmin']>) {
    return this.store.isTaskAssignedToAdmin(...args);
  }

  listTaskActivities(...args: Parameters<DailyTaskPrismaStore['listTaskActivities']>) {
    return this.store.listTaskActivities(...args);
  }

  addTaskComment(...args: Parameters<DailyTaskPrismaStore['addTaskComment']>) {
    return this.store.addTaskComment(...args);
  }

  attachLatestEmployeeNotes(...args: Parameters<DailyTaskPrismaStore['attachLatestEmployeeNotes']>) {
    return this.store.attachLatestEmployeeNotes(...args);
  }

  attachTaskNoteSummaries(...args: Parameters<DailyTaskPrismaStore['attachTaskNoteSummaries']>) {
    return this.store.attachTaskNoteSummaries(...args);
  }

  createTaskNote(...args: Parameters<DailyTaskPrismaStore['createTaskNote']>) {
    return this.store.createTaskNote(...args);
  }

  listTaskNotes(...args: Parameters<DailyTaskPrismaStore['listTaskNotes']>) {
    return this.store.listTaskNotes(...args);
  }

  acknowledgeTaskNote(...args: Parameters<DailyTaskPrismaStore['acknowledgeTaskNote']>) {
    return this.store.acknowledgeTaskNote(...args);
  }
}
