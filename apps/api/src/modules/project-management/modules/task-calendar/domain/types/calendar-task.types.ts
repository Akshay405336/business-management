import type { CalendarTaskDisplayStatus } from '../enums/calendar-task-display-status.enum.js';
import type { CalendarTaskSource } from '../enums/calendar-task-source.enum.js';

export type CalendarTaskNavigation =
  | { readonly kind: 'daily_task'; readonly dailyTaskId: string }
  | { readonly kind: 'project_task'; readonly projectId: string; readonly projectTaskId: string };

export interface CalendarNormalizedTask {
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
