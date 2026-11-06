import type { OrgAccessActor } from '../../../../../org-access/index.js';

export type ListCalendarFiltersQuery = {
  readonly organizationId: string;
  readonly accessActor: OrgAccessActor;
};
