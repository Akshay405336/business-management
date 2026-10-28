/** Organization-scoped CRM actor (admin performing an action). */
export interface CrmActor {
  readonly organizationId: string;
  readonly adminId: string;
}

export function toCrmActor(context: {
  readonly organizationId: string;
  readonly adminId: string;
}): CrmActor {
  return {
    organizationId: context.organizationId,
    adminId: context.adminId,
  };
}
