import type { ProjectActor } from '../access/project-actor.js';

export type GetProjectQuery = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
