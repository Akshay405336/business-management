import type { SaveProjectPlanRequest } from '@techwin/validation';
import type { ProjectActor } from '../shared/project-actor.js';

export type SaveProjectPlanCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly body: SaveProjectPlanRequest;
};
