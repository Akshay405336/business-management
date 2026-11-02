import type { OrgAccessActor } from '../shared/org-access-actor.js';

export type GetMyPermissionsQuery = {
  readonly actor: OrgAccessActor;
};
