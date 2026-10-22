import type { ProjectStatus } from '../../domain/project-types.js';
import type { ProjectActor } from '../access/project-actor.js';

export type ChangeProjectStatusCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly status: ProjectStatus;
};
