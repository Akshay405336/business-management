import type { ProjectActor } from '../access/project-actor.js';

export type ListClientQuotationsQuery = {
  readonly actor: ProjectActor;
  readonly clientId: string;
};
