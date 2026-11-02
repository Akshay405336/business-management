export type InviteMemberCommand = {
  readonly organizationId: string;
  readonly actorAdminId: string;
  readonly email: string;
  readonly roleIds: readonly string[];
};
