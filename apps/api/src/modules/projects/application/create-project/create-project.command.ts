import type { CreateProjectInput } from '../../domain/repositories/project.repository.js';
import type { ProjectActor } from '../access/project-actor.js';

export type CreateProjectCommand = {
  readonly actor: ProjectActor;
  readonly input: CreateProjectInput;
};
