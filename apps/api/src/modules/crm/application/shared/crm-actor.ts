/** Organization-scoped CRM actor (admin performing an action). */
export interface CrmActor {
  readonly organizationId: string;
  readonly adminId: string;
}
