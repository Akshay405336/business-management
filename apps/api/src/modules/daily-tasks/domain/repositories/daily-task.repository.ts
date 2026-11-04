import type {
  DailyTaskActivityItem,
  DailyTaskBoardResponse,
  DailyTaskDetail,
  DailyTaskListItem,
  DailyTaskListResponse,
  DailyTaskNoteItem,
  DailyTaskWorkflowStage,
} from '../read-models/daily-task.models.js';
import type {
  AddDailyTaskCommentInput,
  CreateDailyTaskInput,
  CreateDailyTaskNoteInput,
  DailyTaskBoardQuery,
  DailyTaskListQuery,
  DailyTaskWorkflowStageInput,
  MoveDailyTaskStageInput,
  MyDailyTasksQuery,
  RescheduleDailyTaskInput,
  TaskNoteAttachOptions,
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
    noteAttach?: TaskNoteAttachOptions,
  ): Promise<DailyTaskBoardResponse>;
  listTasks(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday: string,
    employeeIdsForMyTasks?: readonly string[],
    noteAttach?: TaskNoteAttachOptions,
  ): Promise<DailyTaskListResponse>;
  listMyTasks(
    organizationId: string,
    adminId: string,
    query: MyDailyTasksQuery,
    clientToday: string,
    noteAttach?: TaskNoteAttachOptions,
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
  isTaskAssignedToAdmin(
    organizationId: string,
    adminId: string,
    taskId: string,
  ): Promise<boolean>;
  listTaskActivities(organizationId: string, taskId: string): Promise<readonly DailyTaskActivityItem[]>;
  addTaskComment(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: AddDailyTaskCommentInput,
  ): Promise<DailyTaskDetail>;
  attachLatestEmployeeNotes(
    organizationId: string,
    items: readonly DailyTaskListItem[],
  ): Promise<readonly DailyTaskListItem[]>;
  attachTaskNoteSummaries(
    organizationId: string,
    items: readonly DailyTaskListItem[],
    attach: TaskNoteAttachOptions,
  ): Promise<readonly DailyTaskListItem[]>;
  createTaskNote(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: CreateDailyTaskNoteInput,
  ): Promise<DailyTaskNoteItem>;
  listTaskNotes(
    organizationId: string,
    adminId: string,
    taskId: string,
    viewAll: boolean,
  ): Promise<readonly DailyTaskNoteItem[]>;
  acknowledgeTaskNote(
    organizationId: string,
    adminId: string,
    taskId: string,
    noteId: string,
  ): Promise<DailyTaskNoteItem>;
}
