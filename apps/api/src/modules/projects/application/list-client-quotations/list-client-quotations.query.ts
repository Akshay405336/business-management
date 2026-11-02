import type { ProjectActor } from '../shared/project-actor.js';

export type ListClientQuotationsQuery = {
  readonly actor: ProjectActor;
  readonly clientId: string;
};
