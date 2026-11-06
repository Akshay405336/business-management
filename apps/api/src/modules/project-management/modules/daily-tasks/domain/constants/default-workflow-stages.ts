export const DEFAULT_DAILY_TASK_WORKFLOW_STAGES = [
  {
    stageKey: 'todo',
    name: 'To Do',
    sortOrder: 0,
    colorToken: 'slate',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'in_progress',
    name: 'In Progress',
    sortOrder: 1,
    colorToken: 'blue',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'review',
    name: 'Review',
    sortOrder: 2,
    colorToken: 'amber',
    isActive: true,
    isCompletedStage: false,
  },
  {
    stageKey: 'completed',
    name: 'Completed',
    sortOrder: 3,
    colorToken: 'emerald',
    isActive: true,
    isCompletedStage: true,
  },
] as const;
