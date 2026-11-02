import type {
  DailyTaskBoardResponse,
  DailyTaskDetail,
  DailyTaskListResponse,
  DailyTaskWorkflowStage,
} from '../read-models/daily-task.models.js';
import type {
  CreateDailyTaskInput,
  DailyTaskBoardQuery,
  DailyTaskListQuery,
  DailyTaskWorkflowStageInput,
  MoveDailyTaskStageInput,
  MyDailyTasksQuery,
  RescheduleDailyTaskInput,
  UpdateDailyTaskInput,
} from '../types/daily-task-inputs.js';

export const DAILY_TASK_REPOSITORY = Symbol('DAILY_TASK_REPOSITORY');

export interface DailyTaskRepository {
  listWorkflowStages(organizationId: string): Promise<readonly DailyTaskWorkflowStage[]>;
  replaceWorkflowStages(
    organizationId: string,
    stages: readonly DailyTaskWorkflowStageInput[],
  ): Promise<readonly DailyTaskWorkflowStage[]>;
  getBoard(
    organizationId: string,
    query: DailyTaskBoardQuery,
    clientToday?: string,
  ): Promise<DailyTaskBoardResponse>;
  listTasks(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday: string,
  ): Promise<DailyTaskListResponse>;
  listMyTasks(
    organizationId: string,
    adminId: string,
    query: MyDailyTasksQuery,
    clientToday: string,
  ): Promise<DailyTaskListResponse>;
  getTask(organizationId: string, taskId: string, clientToday?: string): Promise<DailyTaskDetail>;
  createTask(
    organizationId: string,
    adminId: string,
    input: CreateDailyTaskInput,
  ): Promise<DailyTaskDetail>;
  updateTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: UpdateDailyTaskInput,
  ): Promise<DailyTaskDetail>;
  moveTaskStage(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: MoveDailyTaskStageInput,
  ): Promise<DailyTaskDetail>;
  rescheduleTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: RescheduleDailyTaskInput,
  ): Promise<DailyTaskDetail>;
  deleteTask(organizationId: string, taskId: string): Promise<void>;
}
