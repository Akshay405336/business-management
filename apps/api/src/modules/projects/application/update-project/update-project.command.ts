import type { UpdateProjectInput } from '../../domain/repositories/project.repository.js';
import type { ProjectActor } from '../shared/project-actor.js';

export type UpdateProjectCommand = {
  readonly actor: ProjectActor;
  readonly projectId: string;
  readonly input: UpdateProjectInput;
};
