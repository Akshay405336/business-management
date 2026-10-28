import type { OrganizationMembershipStatus } from './types';

export const MEMBERSHIP_STATUSES: readonly OrganizationMembershipStatus[] = [
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
  'DEACTIVATED',
] as const;

export const DEFAULT_ORG_MEMBER_PAGE_SIZE = 10;
export const DEFAULT_ORG_ROLE_PAGE_SIZE = 10;
export const ROLE_SEARCH_DEBOUNCE_MS = 400;
