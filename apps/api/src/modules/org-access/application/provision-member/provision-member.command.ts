export type ProvisionMemberCommand = {
  readonly organizationId: string;
  readonly actorAdminId: string;
  readonly email: string;
  readonly displayName: string;
  readonly phone?: string | null;
  readonly password: string;
  readonly roleIds: readonly string[];
  readonly employeeId?: string;
};
