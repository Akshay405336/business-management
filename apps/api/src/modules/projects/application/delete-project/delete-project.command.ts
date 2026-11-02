import type { ProjectActor } from '../shared/project-actor.js';

export type DeleteProjectCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
