export type ResendInvitationCommand = {
  readonly organizationId: string;
  readonly invitationId: string;
  readonly actorAdminId: string;
};
