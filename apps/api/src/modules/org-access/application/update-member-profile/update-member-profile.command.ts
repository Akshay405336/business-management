export type UpdateMemberProfileCommand = {
  readonly organizationId: string;
  readonly membershipId: string;
  readonly actorAdminId: string;
  readonly displayName?: string;
  readonly phone?: string | null;
};
