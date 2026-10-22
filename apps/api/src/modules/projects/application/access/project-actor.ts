/** Trusted tenant + administrator context for project use cases (never from the client body). */
export type ProjectActor = {
  readonly organizationId: string;
  readonly adminId: string;
};
