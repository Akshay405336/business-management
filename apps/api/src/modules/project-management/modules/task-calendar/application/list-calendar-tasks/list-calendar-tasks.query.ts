import type { OrgAccessActor } from '../../../../../org-access/index.js';
import type { TaskCalendarApiQuery } from '@techwin/validation';

/** Input for {@link ListCalendarTasksHandler}. Resolved in the controller from HTTP query + CRM context. */
export type ListCalendarTasksQuery = {
  readonly organizationId: string;
  readonly clientToday: string;
  readonly accessActor: OrgAccessActor;
  readonly query: TaskCalendarApiQuery;
};
