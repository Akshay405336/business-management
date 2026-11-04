import type {
  DailyTaskCategory,
  DailyTaskPriority,
  DailyTaskType,
} from '../read-models/daily-task.models.js';

export type DailyTaskWorkflowStageInput = {
  readonly id?: string;
  readonly stageKey: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly colorToken: string;
  readonly isActive: boolean;
  readonly isCompletedStage: boolean;
};

export type CreateDailyTaskInput = {
  readonly type: DailyTaskType;
  readonly title: string;
  readonly description?: string;
  readonly category?: DailyTaskCategory;
  readonly workflowStageId?: string;
  readonly projectPhaseId?: string;
  readonly priority?: DailyTaskPriority;
  readonly assignDate: string;
  readonly dueDate?: string | null;
  readonly startTimeMinutes?: number | null;
  readonly dueTimeMinutes?: number | null;
  readonly estimatedHours?: number | null;
  readonly projectId?: string | null;
  readonly linkedProjectTaskId?: string | null;
  readonly instructions?: string;
  readonly referenceUrl?: string | null;
  readonly employeeIds: readonly string[];
};

export type UpdateDailyTaskInput = {
  readonly title?: string;
  readonly description?: string;
  readonly category?: DailyTaskCategory | null;
  readonly workflowStageId?: string | null;
  readonly projectPhaseId?: string | null;
  readonly priority?: DailyTaskPriority;
  readonly assignDate?: string;
  readonly dueDate?: string | null;
  readonly startTimeMinutes?: number | null;
  readonly dueTimeMinutes?: number | null;
  readonly estimatedHours?: number | null;
  readonly projectId?: string | null;
  readonly linkedProjectTaskId?: string | null;
  readonly instructions?: string;
  readonly referenceUrl?: string | null;
  readonly employeeIds?: readonly string[];
};

export type MoveDailyTaskStageInput = {
  readonly workflowStageId: string;
  readonly beforeTaskId?: string | null;
};

export type RescheduleDailyTaskInput = {
  readonly assignDate: string;
  readonly note?: string;
};

export type DailyTaskBoardQuery = {
  readonly assignDate: string;
  readonly clientToday?: string;
  readonly search?: string;
  readonly type?: DailyTaskType;
  readonly employeeId?: string;
  readonly projectId?: string;
  readonly priority?: DailyTaskPriority;
  readonly workflowStageId?: string;
  readonly projectPhaseId?: string;
  readonly category?: DailyTaskCategory;
};

export type DailyTaskListQuery = {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly assignDate?: string;
  readonly assignDateFrom?: string;
  readonly assignDateTo?: string;
  readonly type?: DailyTaskType;
  readonly employeeId?: string;
  readonly projectId?: string;
  readonly priority?: DailyTaskPriority;
  readonly workflowStageId?: string;
  readonly projectPhaseId?: string;
  readonly category?: DailyTaskCategory;
  readonly completedOnly?: boolean;
  readonly overdueOnly?: boolean;
  readonly sortBy?: 'assignDate' | 'dueDate' | 'priority' | 'title' | 'updatedAt';
  readonly sortDir?: 'asc' | 'desc';
};

export type MyDailyTasksQuery = {
  readonly scope?: 'today' | 'upcoming' | 'all' | 'completed' | 'overdue';
  readonly assignDate?: string;
  readonly assignDateFrom?: string;
  readonly assignDateTo?: string;
  readonly search?: string;
  readonly type?: DailyTaskType;
  readonly priority?: DailyTaskPriority;
  readonly workflowStageId?: string;
  readonly projectId?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: 'assignDate' | 'dueDate' | 'priority' | 'title' | 'updatedAt';
  readonly sortDir?: 'asc' | 'desc';
};

export type AddDailyTaskCommentInput = {
  readonly text: string;
  readonly scope: 'admin' | 'employee';
};

export type CreateDailyTaskNoteInput = {
  readonly text: string;
};

export type TaskNoteAttachOptions = {
  readonly adminId: string;
  readonly includeOrgUnread: boolean;
  readonly includeOwnSummary: boolean;
};
