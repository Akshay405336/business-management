export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE'] as const satisfies readonly ClientStatus[];
