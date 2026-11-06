import { API_PREFIX } from './http.js';
import type { DailyTaskCategory, DailyTaskPriority, DailyTaskType } from './daily-tasks.js';
import type { ProjectPriority, ProjectStatus } from './projects.js';
import type { ProjectTaskPriority, ProjectTaskStatus } from './project-tasks.js';

export const TASK_CALENDAR_ROUTES = {
  tasks: `${API_PREFIX}/project-management/task-calendar`,
  filters: `${API_PREFIX}/project-management/task-calendar/filters`,
} as const;

/** @deprecated Use TASK_CALENDAR_ROUTES */
export const ORG_TASK_CALENDAR_ROUTES = {
  tasks: TASK_CALENDAR_ROUTES.tasks,
} as const;

export type CalendarTaskSource = 'DAILY_TASK' | 'PROJECT_TASK';

/** Normalized bucket for chips and legend (mapped from source-specific status). */
export type CalendarTaskDisplayStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'OVERDUE';

export type CalendarTaskNavigation =
  | { readonly kind: 'daily_task'; readonly dailyTaskId: string }
  | { readonly kind: 'project_task'; readonly projectId: string; readonly projectTaskId: string };

export interface TaskCalendarTaskDto {
  readonly id: string;
  readonly source: CalendarTaskSource;
  readonly title: string;
  readonly reference: string | null;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly projectNumber: string | null;
  readonly assigneeEmployeeIds: readonly string[];
  readonly assigneeNames: readonly string[];
  readonly assigneeAvatarUrls: readonly (string | null)[];
  readonly taskType: string;
  readonly priority: string;
  readonly statusLabel: string;
  readonly statusDetail: string | null;
  readonly workflowStageKey: string | null;
  readonly displayStatus: CalendarTaskDisplayStatus;
  readonly assignDate: string;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly description: string;
  readonly navigation: CalendarTaskNavigation;
}

export interface TaskCalendarDayBucketDto {
  readonly date: string;
  readonly tasks: readonly TaskCalendarTaskDto[];
  readonly taskCount: number;
  readonly distinctAssigneeCount: number;
}

export interface TaskCalendarResponse {
  readonly startDate: string;
  readonly endDate: string;
  readonly tasks: readonly TaskCalendarTaskDto[];
  readonly days: readonly TaskCalendarDayBucketDto[];
}

export interface TaskCalendarFilterOption {
  readonly id: string;
  readonly label: string;
}

export interface TaskCalendarFiltersResponse {
  readonly employees: readonly TaskCalendarFilterOption[];
  readonly projects: readonly TaskCalendarFilterOption[];
  readonly taskTypes: readonly { readonly value: DailyTaskType | 'PROJECT_PLAN'; readonly label: string }[];
  readonly priorities: readonly { readonly value: string; readonly label: string }[];
  readonly dailyStatuses: readonly { readonly value: string; readonly label: string }[];
  readonly projectTaskStatuses: readonly { readonly value: ProjectTaskStatus; readonly label: string }[];
  readonly sources: readonly { readonly value: CalendarTaskSource; readonly label: string }[];
}

/** HTTP query for task calendar (date range + filters). After validation, start/end are always set. */
export interface TaskCalendarApiQuery {
  readonly clientToday?: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly search?: string;
  readonly type?: DailyTaskType;
  readonly employeeId?: string;
  readonly projectId?: string;
  /** Daily task priority when source is daily or omitted. */
  readonly priority?: DailyTaskPriority;
  /** Project plan task priority when source is PROJECT_TASK. */
  readonly projectTaskPriority?: ProjectTaskPriority;
  readonly workflowStageId?: string;
  readonly projectPhaseId?: string;
  readonly category?: DailyTaskCategory;
  readonly completedOnly?: boolean;
  readonly overdueOnly?: boolean;
  readonly sortBy?: 'assignDate' | 'dueDate' | 'priority' | 'title' | 'updatedAt';
  readonly sortDir?: 'asc' | 'desc';
  readonly projectStatus?: ProjectStatus;
  readonly projectPriority?: ProjectPriority;
  readonly source?: CalendarTaskSource;
  /** Daily stage key (e.g. todo, in_progress) or project task status. */
  readonly status?: string;
  readonly displayStatus?: CalendarTaskDisplayStatus;
}

/** @deprecated Use TaskCalendarApiQuery */
export interface TaskCalendarListQuery {
  readonly clientToday?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
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
  readonly projectStatus?: ProjectStatus;
  readonly projectPriority?: ProjectPriority;
}
