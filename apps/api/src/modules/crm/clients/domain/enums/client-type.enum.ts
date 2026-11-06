export type ClientType = 'INDIVIDUAL' | 'COMPANY';

export const CLIENT_TYPES = ['INDIVIDUAL', 'COMPANY'] as const satisfies readonly ClientType[];
