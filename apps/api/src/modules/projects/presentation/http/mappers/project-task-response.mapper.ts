import type {
  ProjectTask,
  ProjectTaskBoardPhase,
  ProjectTaskBoardResponse,
  ProjectTaskSummaryItem,
  ProjectTaskSummaryListResponse,
} from '@techwin/contracts';
import type {
  PaginatedProjectTaskSummaries,
  ProjectTaskBoardRecord,
  ProjectTaskRecord,
} from '../../../domain/repositories/project-task.repository.js';

export function toProjectTask(record: ProjectTaskRecord): ProjectTask {
  return {
    id: record.id,
    projectId: record.projectId,
    phaseId: record.phaseId,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    assigneeAdminId: record.assigneeAdminId,
    assignee: record.assignee,
    startDate: record.startDate,
    dueDate: record.dueDate,
    actualStartedAt: record.actualStartedAt,
    actualCompletedAt: record.actualCompletedAt,
    labels: record.labels,
    sortOrder: record.sortOrder,
    inPlanBaseline: record.inPlanBaseline,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toProjectTaskSummaryItem(
  record: PaginatedProjectTaskSummaries['items'][number],
): ProjectTaskSummaryItem {
  return { ...record };
}

export function toProjectTaskSummaryListResponse(
  result: PaginatedProjectTaskSummaries,
): ProjectTaskSummaryListResponse {
  return {
    items: result.items.map(toProjectTaskSummaryItem),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    tabCounts: result.tabCounts,
  };
}

export function toProjectTaskBoardResponse(record: ProjectTaskBoardRecord): ProjectTaskBoardResponse {
  const phases: ProjectTaskBoardPhase[] = record.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    description: phase.description,
    status: phase.status,
    startDate: phase.startDate,
    expectedEndDate: phase.expectedEndDate,
    actualStartedAt: phase.actualStartedAt,
    actualCompletedAt: phase.actualCompletedAt,
    sortOrder: phase.sortOrder,
    taskCount: phase.taskCount,
    completedTaskCount: phase.completedTaskCount,
    progressPercent: phase.progressPercent,
    tasks: phase.tasks.map(toProjectTask),
  }));
  return {
    project: { ...record.project },
    phases,
  };
}
