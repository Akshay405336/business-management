export type RevokeInvitationCommand = {
  readonly organizationId: string;
  readonly invitationId: string;
  readonly actorAdminId: string;
};
