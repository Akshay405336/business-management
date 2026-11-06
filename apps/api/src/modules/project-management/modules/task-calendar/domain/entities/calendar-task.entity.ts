import type { DailyTaskListItem } from '@techwin/contracts';
import type { TaskCalendarProjectTaskRow } from '../../application/integration/org-task-calendar-data.port.js';
import type { CalendarNormalizedTask } from '../types/calendar-task.types.js';
import {
  resolveDailyTaskDisplayStatus,
  resolveProjectTaskDisplayStatus,
} from '../services/calendar-task-display-status.service.js';

function uniqueAssigneesFromDaily(task: DailyTaskListItem): {
  ids: string[];
  names: string[];
  avatars: (string | null)[];
} {
  const ids: string[] = [];
  const names: string[] = [];
  const avatars: (string | null)[] = [];
  const seen = new Set<string>();
  for (const a of task.assignees) {
    if (seen.has(a.employeeId)) continue;
    seen.add(a.employeeId);
    ids.push(a.employeeId);
    names.push(a.displayName);
    avatars.push(a.profileImageUrl);
  }
  return { ids, names, avatars };
}

export function fromDailyTaskListItem(task: DailyTaskListItem, clientToday: string): CalendarNormalizedTask {
  const { ids, names, avatars } = uniqueAssigneesFromDaily(task);
  const displayStatus = resolveDailyTaskDisplayStatus(task, clientToday);
  return {
    id: task.id,
    source: 'DAILY_TASK',
    title: task.title,
    reference: null,
    projectId: task.projectId,
    projectName: task.projectName,
    projectNumber: null,
    assigneeEmployeeIds: ids,
    assigneeNames: names,
    assigneeAvatarUrls: avatars,
    taskType: task.type,
    priority: task.priority,
    statusLabel: task.stageName,
    statusDetail: task.workflowStageName,
    workflowStageKey: task.workflowStageKey,
    displayStatus,
    assignDate: task.assignDate,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    description: task.description,
    navigation: { kind: 'daily_task', dailyTaskId: task.id },
  };
}

export function fromProjectTaskRow(
  task: TaskCalendarProjectTaskRow,
  clientToday: string,
): CalendarNormalizedTask | null {
  /** Single calendar placement: scheduled start when present, otherwise due date only — never "today" or month fallback. */
  const scheduledDate = task.startDate ?? task.dueDate;
  if (!scheduledDate) return null;

  const displayStatus = resolveProjectTaskDisplayStatus(task.status, task, clientToday);
  const ids: string[] = [];
  const names: string[] = [];
  const avatars: (string | null)[] = [];
  if (task.assigneeEmployee) {
    ids.push(task.assigneeEmployee.id);
    names.push(task.assigneeEmployee.displayName);
    avatars.push(task.assigneeEmployee.profileImageUrl);
  } else if (task.assignee) {
    names.push(task.assignee.displayName);
    avatars.push(null);
  }
  return {
    id: task.id,
    source: 'PROJECT_TASK',
    title: task.title,
    reference: task.projectNumber ? `${task.projectNumber}` : null,
    projectId: task.projectId,
    projectName: task.projectName,
    projectNumber: task.projectNumber,
    assigneeEmployeeIds: ids,
    assigneeNames: names,
    assigneeAvatarUrls: avatars,
    taskType: 'PROJECT_PLAN',
    priority: task.priority,
    statusLabel: task.status,
    statusDetail: null,
    workflowStageKey: null,
    displayStatus,
    assignDate: scheduledDate,
    dueDate: task.dueDate,
    completedAt: task.actualCompletedAt,
    description: task.description,
    navigation: { kind: 'project_task', projectId: task.projectId, projectTaskId: task.id },
  };
}
