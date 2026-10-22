import type { ProjectActor } from '../access/project-actor.js';

export type DeleteProjectCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
