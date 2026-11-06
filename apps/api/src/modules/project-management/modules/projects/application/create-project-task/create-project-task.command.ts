import type { CreateProjectTaskRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../../../org-access/index.js';
import type { ProjectActor } from '../shared/project-actor.js';

export type CreateProjectTaskCommand = {
  readonly actor: ProjectActor;
  readonly accessActor: OrgAccessActor;
  readonly projectId: string;
  readonly input: CreateProjectTaskRequest;
};
