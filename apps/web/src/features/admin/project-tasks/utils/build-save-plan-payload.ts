import type { SaveProjectPlanRequest } from '@techwin/validation';
import type { ProjectDetail } from '@/features/admin/projects/types';
import { toDateInputValue } from '@/features/admin/crm/utils/format';
import type { ProjectPhaseFormRow } from '@/features/admin/projects/utils/project-form';
import type { ProjectTaskBoardPhase } from '../types';

function mapPhaseTasks(phase: ProjectTaskBoardPhase) {
  return phase.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    priority: task.priority,
    assigneeAdminId: task.assigneeAdminId,
    startDate: task.startDate,
    dueDate: task.dueDate,
  }));
}

/** Build save-plan body from board tasks + phase metadata (detail or edited rows). */
export function buildSavePlanPayload(
  project: ProjectDetail,
  boardPhases: readonly ProjectTaskBoardPhase[],
  phaseRows?: readonly ProjectPhaseFormRow[],
): SaveProjectPlanRequest {
  const tasksByPhaseId = new Map(boardPhases.map((phase) => [phase.id, phase]));
  const ownerByPhaseId = new Map(project.phases.map((phase) => [phase.id, phase.ownerAdminId]));

  if (phaseRows && phaseRows.length > 0) {
    return {
      phases: phaseRows.map((row) => {
        const boardPhase = row.id ? tasksByPhaseId.get(row.id) : undefined;
        return {
          ...(row.id ? { id: row.id } : {}),
          name: row.name.trim(),
          description: row.description.trim() || undefined,
          startDate: toDateInputValue(row.startDate),
          expectedEndDate: toDateInputValue(row.expectedEndDate),
          ownerAdminId: row.id ? (ownerByPhaseId.get(row.id) ?? null) : null,
          tasks: boardPhase ? mapPhaseTasks(boardPhase) : [],
        };
      }),
    };
  }

  return {
    phases: boardPhases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      description: phase.description || undefined,
      startDate: phase.startDate,
      expectedEndDate: phase.expectedEndDate,
      ownerAdminId: ownerByPhaseId.get(phase.id) ?? null,
      tasks: mapPhaseTasks(phase),
    })),
  };
}
