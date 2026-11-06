import type { ProjectManagerRecord } from '../../domain/repositories/project.repository.js';

export type ListProjectManagersResult = {
  readonly managers: readonly ProjectManagerRecord[];
};
