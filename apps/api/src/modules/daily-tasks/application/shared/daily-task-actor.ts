/** Trusted tenant + administrator context for daily task use cases. */
export type DailyTaskActor = {
  readonly organizationId: string;
  readonly adminId: string;
};
