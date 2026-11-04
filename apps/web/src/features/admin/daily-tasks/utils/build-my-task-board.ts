import type {
  DailyTaskBoardResponse,
  DailyTaskListItem,
  DailyTaskWorkflowStage,
} from '../types';

export function buildMyTaskBoard(input: {
  assignDate: string;
  stages: readonly DailyTaskWorkflowStage[];
  tasks: readonly DailyTaskListItem[];
}): DailyTaskBoardResponse {
  const activeStages = input.stages.filter((stage) => stage.isActive);
  const fallbackStageId =
    activeStages.find((stage) => stage.stageKey === 'todo')?.id ?? activeStages[0]?.id ?? null;

  const columns = activeStages.map((stage) => ({
    stage: {
      id: stage.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
      colorToken: stage.colorToken,
      columnKind: 'daily' as const,
      stageKey: stage.stageKey,
      isCompletedStage: stage.isCompletedStage,
    },
    tasks: input.tasks.filter(
      (task) => (task.workflowStageId ?? fallbackStageId) === stage.id,
    ),
  }));

  const todo = columns.find((c) => c.stage.stageKey === 'todo')?.tasks.length ?? 0;
  const inProgress = columns.find((c) => c.stage.stageKey === 'in_progress')?.tasks.length ?? 0;
  const review = columns.find((c) => c.stage.stageKey === 'review')?.tasks.length ?? 0;
  const completed = input.tasks.filter((t) => t.completedAt).length;

  return {
    assignDate: input.assignDate,
    boardMode: 'daily',
    projectId: null,
    projectName: null,
    stages: activeStages,
    columns,
    projectBoards: [],
    projectTasksOverview: [],
    metrics: {
      total: input.tasks.length,
      todo,
      inProgress,
      review,
      completed,
      overdue: input.tasks.filter((t) => t.isOverdue).length,
    },
  };
}
