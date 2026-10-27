import type { OrganizationMembershipStatus, OrganizationRoleStatus } from '../types';

const membershipStatusLabels: Record<OrganizationMembershipStatus, string> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

const roleStatusLabels: Record<OrganizationRoleStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export function labelMembershipStatus(status: OrganizationMembershipStatus): string {
  return membershipStatusLabels[status];
}

export function labelRoleStatus(status: OrganizationRoleStatus): string {
  return roleStatusLabels[status];
}
