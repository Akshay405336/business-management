import { API_PREFIX } from './http.js';
import type { ProjectPhaseStatus } from './projects.js';

export const DAILY_TASK_ROUTES = {
  workflowStages: `${API_PREFIX}/daily-tasks/workflow-stages`,
  board: `${API_PREFIX}/daily-tasks/board`,
  tasks: `${API_PREFIX}/daily-tasks`,
  task: (id: string) => `${API_PREFIX}/daily-tasks/${id}`,
  moveStage: (id: string) => `${API_PREFIX}/daily-tasks/${id}/stage`,
  reschedule: (id: string) => `${API_PREFIX}/daily-tasks/${id}/reschedule`,
  myTasks: `${API_PREFIX}/daily-tasks/my`,
  activities: (id: string) => `${API_PREFIX}/daily-tasks/${id}/activities`,
  comments: (id: string) => `${API_PREFIX}/daily-tasks/${id}/comments`,
  notes: (id: string) => `${API_PREFIX}/daily-tasks/${id}/notes`,
  noteAcknowledge: (taskId: string, noteId: string) =>
    `${API_PREFIX}/daily-tasks/${taskId}/notes/${noteId}/acknowledge`,
} as const;

export type DailyTaskNoteAcknowledgementStatus = 'UNREAD' | 'ACKNOWLEDGED';

export interface DailyTaskNoteItem {
  readonly id: string;
  readonly dailyTaskId: string;
  readonly employeeId: string;
  readonly employeeDisplayName: string;
  readonly employeeProfileImageUrl: string | null;
  readonly authorAdminId: string;
  readonly text: string;
  readonly acknowledgementStatus: DailyTaskNoteAcknowledgementStatus;
  readonly acknowledgedByAdminId: string | null;
  readonly acknowledgedByDisplayName: string | null;
  readonly acknowledgedAt: string | null;
  readonly createdAt: string;
}

export interface DailyTaskNotesResponse {
  readonly items: readonly DailyTaskNoteItem[];
}

export interface DailyTaskNotesCardSummary {
  readonly unreadCount: number;
  readonly totalCount: number;
  readonly latest: DailyTaskNoteItem | null;
}

/** @deprecated Use DailyTaskNotesCardSummary */
export type DailyTaskMyNotesSummary = DailyTaskNotesCardSummary;

export type DailyTaskActivityEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'STAGE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEES_CHANGED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'REOPENED'
  | 'COMMENT_ADDED';

export interface DailyTaskLatestNotePreview {
  readonly text: string;
  readonly authorName: string;
  readonly authorEmployeeId: string | null;
  readonly occurredAt: string;
  readonly scope: 'employee' | 'admin';
}

export interface DailyTaskActivityItem {
  readonly id: string;
  readonly eventType: DailyTaskActivityEventType;
  readonly occurredAt: string;
  readonly actorAdminId: string;
  readonly actorDisplayName: string;
  readonly actorEmployeeId: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export type DailyTaskType = 'GENERAL' | 'PROJECT';
export type DailyTaskBoardMode = 'daily' | 'project';
export type DailyTaskColumnKind = 'daily' | 'project';

export type DailyTaskCategory =
  | 'DEVELOPMENT'
  | 'DESIGN'
  | 'TESTING'
  | 'DOCUMENTATION'
  | 'MEETING'
  | 'SUPPORT'
  | 'ADMINISTRATION'
  | 'RESEARCH'
  | 'OTHER';
export type DailyTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface DailyTaskWorkflowStage {
  readonly id: string;
  readonly stageKey: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly colorToken: string;
  readonly isActive: boolean;
  readonly isCompletedStage: boolean;
}

export interface DailyTaskBoardColumnStage {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly colorToken: string;
  readonly columnKind: DailyTaskColumnKind;
  readonly stageKey?: string;
  readonly isCompletedStage?: boolean;
  readonly projectPhaseStatus?: ProjectPhaseStatus;
}

export interface DailyTaskAssigneeSummary {
  readonly id: string;
  readonly employeeId: string;
  readonly displayName: string;
  readonly jobTitle: string;
  readonly profileImageUrl: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export interface DailyTaskListItem {
  readonly id: string;
  readonly type: DailyTaskType;
  readonly title: string;
  readonly description: string;
  readonly category: DailyTaskCategory | null;
  readonly workflowStageId: string | null;
  readonly workflowStageKey: string | null;
  readonly workflowStageName: string | null;
  readonly projectPhaseId: string | null;
  readonly projectPhaseName: string | null;
  readonly stageName: string;
  readonly stageKind: DailyTaskColumnKind;
  readonly priority: DailyTaskPriority;
  readonly assignDate: string;
  readonly dueDate: string | null;
  readonly startTimeMinutes: number | null;
  readonly dueTimeMinutes: number | null;
  readonly estimatedHours: number | null;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly linkedProjectTaskId: string | null;
  readonly instructions: string;
  readonly referenceUrl: string | null;
  readonly completedAt: string | null;
  readonly isOverdue: boolean;
  readonly assignees: readonly DailyTaskAssigneeSummary[];
  readonly latestEmployeeNote: DailyTaskLatestNotePreview | null;
  readonly unreadEmployeeNoteCount: number;
  readonly orgTaskNotes: DailyTaskNotesCardSummary | null;
  readonly myTaskNotes: DailyTaskNotesCardSummary | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type DailyTaskDetail = DailyTaskListItem;

export interface DailyTaskBoardColumn {
  readonly stage: DailyTaskBoardColumnStage;
  readonly tasks: readonly DailyTaskListItem[];
}

export interface DailyTaskProjectBoardSlice {
  readonly projectId: string;
  readonly projectName: string;
  readonly columns: readonly DailyTaskBoardColumn[];
}

export interface DailyTaskBoardResponse {
  readonly assignDate: string;
  readonly boardMode: DailyTaskBoardMode;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly stages: readonly DailyTaskWorkflowStage[];
  readonly columns: readonly DailyTaskBoardColumn[];
  /** Project phase kanbans when viewing the combined daily workspace (no project filter). */
  readonly projectBoards: readonly DailyTaskProjectBoardSlice[];
  readonly projectTasksOverview: readonly DailyTaskListItem[];
  readonly metrics: {
    readonly total: number;
    readonly todo: number;
    readonly inProgress: number;
    readonly review: number;
    readonly completed: number;
    readonly overdue: number;
  };
}

export interface DailyTaskListResponse {
  readonly items: readonly DailyTaskListItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface DailyTaskWorkflowStagesResponse {
  readonly stages: readonly DailyTaskWorkflowStage[];
}

export interface DailyTaskActivitiesResponse {
  readonly items: readonly DailyTaskActivityItem[];
}
