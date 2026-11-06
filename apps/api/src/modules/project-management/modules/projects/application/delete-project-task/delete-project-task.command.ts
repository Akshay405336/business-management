import type { ProjectActor } from '../shared/project-actor.js';

export type DeleteProjectTaskCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly taskId: string;
};
