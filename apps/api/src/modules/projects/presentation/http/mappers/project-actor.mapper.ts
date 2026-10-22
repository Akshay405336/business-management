import type { ProjectActor } from '../../../application/access/project-actor.js';

export type ProjectRequestContext = {
  readonly organizationId: string;
  readonly adminId: string;
};

export function toProjectActor(context: ProjectRequestContext): ProjectActor {
  return {
    organizationId: context.organizationId,
    adminId: context.adminId,
  };
}
