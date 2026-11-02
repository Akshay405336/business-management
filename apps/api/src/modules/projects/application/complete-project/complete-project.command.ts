import type { ProjectActor } from '../shared/project-actor.js';

export type CompleteProjectCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
