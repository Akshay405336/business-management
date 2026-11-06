export type LeadTagReadModel = {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly color: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateLeadTagData = {
  readonly name: string;
  readonly color?: string;
};

export type UpdateLeadTagData = {
  readonly name?: string;
  readonly color?: string;
};
