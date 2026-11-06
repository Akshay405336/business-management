import type { DailyTaskListItem } from '@techwin/contracts';
import type { ProjectTaskPriority, ProjectTaskStatus } from '../../../projects/domain/project-task-types.js';
import type {
  DailyTaskListQuery,
  TaskNoteAttachOptions,
} from '../../../daily-tasks/domain/types/daily-task-inputs.js';

/** Application port: read-only calendar aggregation over Daily Tasks and Project Tasks. */
export const ORG_TASK_CALENDAR_DATA = Symbol('ORG_TASK_CALENDAR_DATA');

/** Row from persistence for a project plan task in a calendar range (read model). */
export interface TaskCalendarProjectTaskRow {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly projectNumber: string;
  readonly phaseId: string;
  readonly title: string;
  readonly description: string;
  readonly priority: ProjectTaskPriority;
  readonly status: ProjectTaskStatus;
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly actualCompletedAt: string | null;
  readonly assigneeAdminId: string | null;
  readonly assignee: {
    readonly id: string;
    readonly displayName: string;
    readonly email: string;
  } | null;
  readonly assigneeEmployee: {
    readonly id: string;
    readonly displayName: string;
    readonly profileImageUrl: string | null;
    readonly profileImageStoredObjectId: string | null;
  } | null;
}

export interface ListProjectTasksForCalendarFilters {
  readonly startDate: string;
  readonly endDate: string;
  readonly search?: string;
  readonly projectId?: string;
  readonly employeeId?: string;
  readonly priority?: ProjectTaskPriority;
  readonly status?: ProjectTaskStatus;
}

export interface OrgTaskCalendarDataPort {
  listDailyTasksInRange(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday: string,
    noteAttach?: TaskNoteAttachOptions,
  ): Promise<readonly DailyTaskListItem[]>;

  listProjectTasksForCalendar(
    organizationId: string,
    filters: ListProjectTasksForCalendarFilters,
  ): Promise<readonly TaskCalendarProjectTaskRow[]>;
}
