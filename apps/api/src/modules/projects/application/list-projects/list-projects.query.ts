import type { ProjectListQuery } from '@techwin/validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type ListProjectsQuery = {
  readonly actor: ProjectActor;
  readonly listQuery: ProjectListQuery;
};
