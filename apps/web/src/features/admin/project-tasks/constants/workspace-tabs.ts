export type ProjectWorkspaceTabKey =
  | 'plan'
  | 'tasks'
  | 'timeline'
  | 'team'
  | 'files'
  | 'activity'
  | 'settings';

export const PROJECT_WORKSPACE_TABS: readonly {
  key: ProjectWorkspaceTabKey;
  label: string;
  implemented: boolean;
}[] = [
  { key: 'plan', label: 'Plan', implemented: true },
  { key: 'tasks', label: 'Tasks', implemented: true },
  { key: 'timeline', label: 'Timeline', implemented: false },
  { key: 'team', label: 'Team', implemented: false },
  { key: 'files', label: 'Files', implemented: false },
  { key: 'activity', label: 'Activity', implemented: false },
  { key: 'settings', label: 'Settings', implemented: false },
] as const;

export function projectWorkspaceTabHref(projectId: string, key: ProjectWorkspaceTabKey): string | null {
  if (key === 'plan') return `/admin/project-tasks/${projectId}/plan`;
  if (key === 'tasks') return `/admin/project-tasks/${projectId}`;
  return null;
}
