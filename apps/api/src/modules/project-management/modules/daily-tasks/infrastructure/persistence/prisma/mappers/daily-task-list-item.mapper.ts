import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import type { Prisma } from '../../../../../../../../generated/prisma/client.js';
import type { DailyTaskListItem } from '../../../../domain/read-models/daily-task.models.js';

export const dateOnlyFromDb = (value: Date): string => value.toISOString().slice(0, 10);

export type DailyTaskListRow = Prisma.DailyTaskGetPayload<{
  include: {
    workflowStage: true;
    projectPhase: true;
    project: { select: { id: true; name: true } };
    assignees: {
      include: {
        employee: {
          select: {
            id: true;
            displayName: true;
            jobTitle: true;
            profileImageStoredObjectId: true;
            profileImageUrl: true;
          };
        };
      };
    };
  };
}>;

export function toDailyTaskListItem(row: DailyTaskListRow, clientToday?: string): DailyTaskListItem {
  const assignDate = dateOnlyFromDb(row.assignDate);
  const completed = Boolean(row.completedAt);
  const isOverdue = Boolean(
    !completed &&
      ((clientToday && assignDate < clientToday) ||
        (row.dueDate && dateOnlyFromDb(row.dueDate) < (clientToday ?? assignDate))),
  );

  const stageKind = 'daily' as const;
  const stageName = row.workflowStage?.name ?? 'Unassigned';

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    category: row.category,
    workflowStageId: row.workflowStageId,
    workflowStageKey: row.workflowStage?.stageKey ?? null,
    workflowStageName: row.workflowStage?.name ?? null,
    projectPhaseId: row.projectPhaseId,
    projectPhaseName: row.projectPhase?.name ?? null,
    stageKind,
    stageName,
    priority: row.priority,
    assignDate,
    dueDate: row.dueDate ? dateOnlyFromDb(row.dueDate) : null,
    startTimeMinutes: row.startTimeMinutes,
    dueTimeMinutes: row.dueTimeMinutes,
    estimatedHours: row.estimatedHours ? Number(row.estimatedHours) : null,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    linkedProjectTaskId: row.linkedProjectTaskId,
    instructions: row.instructions,
    referenceUrl: row.referenceUrl,
    completedAt: row.completedAt?.toISOString() ?? null,
    isOverdue,
    assignees: row.assignees.map((assignee) => ({
      id: assignee.id,
      employeeId: assignee.employeeId,
      displayName: assignee.employee.displayName,
      jobTitle: assignee.employee.jobTitle,
      profileImageUrl: assignee.employee.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(
            assignee.employee.profileImageStoredObjectId,
          )
        : assignee.employee.profileImageUrl,
      startedAt: assignee.startedAt?.toISOString() ?? null,
      completedAt: assignee.completedAt?.toISOString() ?? null,
    })),
    latestEmployeeNote: null,
    unreadEmployeeNoteCount: 0,
    orgTaskNotes: null,
    myTaskNotes: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
