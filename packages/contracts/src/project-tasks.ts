import { API_PREFIX } from './http.js';
import type {
  ProjectExecutionLifecycle,
  ProjectLifecycleTab,
  ProjectPhaseStatus,
  ProjectPriority,
  ProjectStatus,
} from './projects.js';

export const PROJECT_TASK_ROUTES = {
  projectSummaries: `${API_PREFIX}/project-tasks/projects`,
  board: (projectId: string) => `${API_PREFIX}/project-tasks/projects/${projectId}/board`,
  tasks: (projectId: string) => `${API_PREFIX}/project-tasks/projects/${projectId}/tasks`,
  task: (projectId: string, taskId: string) =>
    `${API_PREFIX}/project-tasks/projects/${projectId}/tasks/${taskId}`,
  moveTask: (projectId: string, taskId: string) =>
    `${API_PREFIX}/project-tasks/projects/${projectId}/tasks/${taskId}/move`,
} as const;

export type ProjectTaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
export type ProjectTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProjectTaskAssignee {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export interface ProjectTask {
  readonly id: string;
  readonly projectId: string;
  readonly phaseId: string;
  readonly title: string;
  readonly description: string;
  readonly status: ProjectTaskStatus;
  readonly priority: ProjectTaskPriority;
  readonly assigneeAdminId: string | null;
  readonly assignee: ProjectTaskAssignee | null;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly labels: readonly string[];
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectTaskSummaryPhaseItem {
  readonly id: string;
  readonly name: string;
  readonly status: ProjectPhaseStatus;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly sortOrder: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
}

export interface ProjectTaskSummaryItem {
  readonly id: string;
  readonly projectNumber: string;
  readonly name: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly companyName: string;
  readonly priority: ProjectPriority;
  readonly status: ProjectStatus;
  readonly executionLifecycle: ProjectExecutionLifecycle;
  readonly actualProductionStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly phaseCount: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
  readonly phases: readonly ProjectTaskSummaryPhaseItem[];
}

export interface ProjectTaskSummaryListResponse {
  readonly items: readonly ProjectTaskSummaryItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly tabCounts: {
    readonly all: number;
    readonly notPlanned: number;
    readonly planned: number;
    readonly inProduction: number;
    readonly completed: number;
  };
}

export interface ProjectTaskBoardPhase {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: import('./projects.js').ProjectPhaseStatus;
  readonly startDate: string;
  readonly expectedEndDate: string;
  readonly actualStartedAt: string | null;
  readonly actualCompletedAt: string | null;
  readonly sortOrder: number;
  readonly taskCount: number;
  readonly completedTaskCount: number;
  readonly progressPercent: number;
  readonly tasks: readonly ProjectTask[];
}

export interface ProjectTaskBoardResponse {
  readonly project: {
    readonly id: string;
    readonly projectNumber: string;
    readonly name: string;
    readonly clientName: string;
    readonly companyName: string;
    readonly status: ProjectStatus;
    readonly executionLifecycle: ProjectExecutionLifecycle;
    readonly actualProductionStartedAt: string | null;
    readonly actualCompletedAt: string | null;
    readonly priority: ProjectPriority;
    readonly startDate: string;
    readonly expectedEndDate: string;
    readonly phaseCount: number;
    readonly taskCount: number;
    readonly completedTaskCount: number;
    readonly progressPercent: number;
  };
  readonly phases: readonly ProjectTaskBoardPhase[];
}

export type { ProjectLifecycleTab };
