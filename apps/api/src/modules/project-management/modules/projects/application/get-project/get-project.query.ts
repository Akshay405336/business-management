import type { ProjectActor } from '../shared/project-actor.js';

export type GetProjectQuery = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
