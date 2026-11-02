export type AssignMemberRolesCommand = {
  readonly organizationId: string;
  readonly membershipId: string;
  readonly actorAdminId: string;
  readonly roleIds: readonly string[];
};
