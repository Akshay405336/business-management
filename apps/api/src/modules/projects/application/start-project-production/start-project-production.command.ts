import type { ProjectActor } from '../shared/project-actor.js';

export type StartProjectProductionCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
