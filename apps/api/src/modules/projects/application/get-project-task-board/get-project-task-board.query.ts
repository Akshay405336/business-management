import type { ProjectActor } from '../access/project-actor.js';

export type GetProjectTaskBoardQuery = {
  readonly actor: ProjectActor;
  readonly projectId: string;
};
