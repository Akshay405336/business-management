import type { ProjectListQuery } from '@techwin/validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ListProjectTaskSummariesQuery = {
  readonly actor: ProjectActor;
  readonly listQuery: ProjectListQuery;
};
