import type { UpdateProjectTaskRequest } from '@techwin/validation';
import type { OrgAccessActor } from '../../../org-access/index.js';
import type { ProjectActor } from '../shared/project-actor.js';

export type UpdateProjectTaskCommand = {
  readonly actor: ProjectActor;
  readonly accessActor: OrgAccessActor;
  readonly projectId: string;
  readonly taskId: string;
  readonly input: UpdateProjectTaskRequest;
};
