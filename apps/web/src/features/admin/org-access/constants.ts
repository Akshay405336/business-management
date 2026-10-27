import type { OrganizationMembershipStatus } from './types';

export const MEMBERSHIP_STATUSES: readonly OrganizationMembershipStatus[] = [
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
  'DEACTIVATED',
] as const;

export const DEFAULT_ORG_MEMBER_PAGE_SIZE = 10;
