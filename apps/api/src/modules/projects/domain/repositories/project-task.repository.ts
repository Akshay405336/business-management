import type { ProjectLifecycleTab } from '../project-types.js';
import type { ProjectTaskPriority, ProjectTaskStatus } from '../project-task-types.js';
import type { ProjectListTabCounts } from './project.repository.js';

export const PROJECT_TASK_REPOSITORY = Symbol('PROJECT_TASK_REPOSITORY');

export interface ProjectTaskAssigneeRecord {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface ProjectTaskRecord {
  readonly id: string;
  readonly projectId: string;
  readonly phaseId: string;
  readonly title: string;
  readonly description: string;
  readonly status: ProjectTaskStatus;
  readonly priority: ProjectTaskPriority;
  readonly assigneeAdminId: string | null;
  readonly assignee: ProjectTaskAssigneeRecord | null;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly labels: readonly string[];
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectTaskSummaryPhaseRecord {
  readonly id: string;
  readonly name: string;
  readonly status: import('../project-types.js').ProjectPhaseStatus;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly sortOrder: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
}

export interface ProjectTaskSummaryRecord {
  readonly id: string;
  readonly projectNumber: string;
  readonly name: string;
  readonly description: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientPhone: string;
  readonly companyName: string;
  readonly priority: import('../project-types.js').ProjectPriority;
  readonly status: import('../project-types.js').ProjectStatus;
  readonly executionLifecycle: import('../project-types.js').ProjectExecutionLifecycle;
  readonly actualProductionStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly phaseCount: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
  readonly phases: readonly ProjectTaskSummaryPhaseRecord[];
}

export interface ProjectTaskBoardPhaseRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: import('../project-types.js').ProjectPhaseStatus;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly sortOrder: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
  readonly tasks: readonly ProjectTaskRecord[];
}

export interface ProjectTaskBoardRecord {
  readonly project: {
    readonly id: string;
    readonly projectNumber: string;
    readonly name: string;
    readonly clientName: string;
    readonly companyName: string;
    readonly status: import('../project-types.js').ProjectStatus;
    readonly executionLifecycle: import('../project-types.js').ProjectExecutionLifecycle;
    readonly actualProductionStartedAt: string | null;
    readonly actualCompletedAt: string | null;
    readonly priority: import('../project-types.js').ProjectPriority;
    readonly startDate: string;
    readonly expectedEndDate: string;
    readonly phaseCount: number;
    readonly taskCount: number;
    readonly completedTaskCount: number;
    readonly progressPercent: number;
  };
  readonly phases: readonly ProjectTaskBoardPhaseRecord[];
}

export interface ProjectTaskSummaryListFilters {
  readonly search?: string;
  readonly status?: import('../project-types.js').ProjectStatus;
  readonly priority?: import('../project-types.js').ProjectPriority;
  readonly lifecycleTab?: ProjectLifecycleTab;
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginatedProjectTaskSummaries {
  readonly items: readonly ProjectTaskSummaryRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly tabCounts: ProjectListTabCounts;
}

export interface CreateProjectTaskInput {
  readonly title: string;
  readonly phaseId: string;
  readonly priority: ProjectTaskPriority;
  readonly status: ProjectTaskStatus;
  readonly description?: string;
  readonly assigneeAdminId?: string | null;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
  readonly labels?: readonly string[];
}

export interface UpdateProjectTaskInput {
  readonly title?: string;
  readonly phaseId?: string;
  readonly priority?: ProjectTaskPriority;
  readonly status?: ProjectTaskStatus;
  readonly description?: string;
  readonly assigneeAdminId?: string | null;
  readonly startDate?: string | null;
  readonly dueDate?: string | null;
  readonly labels?: readonly string[];
}

export interface ProjectTaskRepository {
  listProjectSummaries(
    organizationId: string,
    filters: ProjectTaskSummaryListFilters,
  ): Promise<PaginatedProjectTaskSummaries>;

  getProjectBoard(organizationId: string, projectId: string): Promise<ProjectTaskBoardRecord>;

  getTask(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<ProjectTaskRecord | null>;

  createTask(
    organizationId: string,
    projectId: string,
    input: CreateProjectTaskInput,
  ): Promise<ProjectTaskRecord>;

  updateTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    input: UpdateProjectTaskInput,
  ): Promise<ProjectTaskRecord>;

  deleteTask(organizationId: string, projectId: string, taskId: string): Promise<void>;

  moveTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    phaseId: string,
    beforeTaskId: string | null | undefined,
  ): Promise<ProjectTaskRecord>;
}
