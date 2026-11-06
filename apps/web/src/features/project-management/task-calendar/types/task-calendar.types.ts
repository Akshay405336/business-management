import type {
  CalendarTaskDisplayStatus,
  CalendarTaskSource,
  DailyTaskCategory,
  DailyTaskPriority,
  DailyTaskType,
  ProjectPriority,
  ProjectStatus,
  ProjectTaskPriority,
  TaskCalendarResponse,
} from '@techwin/contracts';

/** URL/query filter: excludes API-only `OVERDUE` bucket (Task Calendar UI). */
export type TaskCalendarUiDisplayStatus = Exclude<CalendarTaskDisplayStatus, 'OVERDUE'>;

export type TaskCalendarRequestQuery = {
  clientToday?: string;
  startDate: string;
  endDate: string;
  search?: string;
  type?: DailyTaskType;
  employeeId?: string;
  projectId?: string;
  priority?: DailyTaskPriority;
  projectTaskPriority?: ProjectTaskPriority;
  workflowStageId?: string;
  projectPhaseId?: string;
  category?: DailyTaskCategory;
  completedOnly?: boolean;
  overdueOnly?: boolean;
  projectStatus?: ProjectStatus;
  projectPriority?: ProjectPriority;
  source?: CalendarTaskSource;
  status?: string;
  displayStatus?: TaskCalendarUiDisplayStatus;
};

export type { TaskCalendarResponse };
