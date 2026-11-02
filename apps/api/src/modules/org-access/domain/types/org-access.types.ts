/** Domain-aligned permission and organization access types (mirrors shared contracts). */

export type PermissionKey = string;

export type SystemRoleKey = string;

export type OrganizationMembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'DEACTIVATED';

export type OrganizationRoleStatus = 'ACTIVE' | 'INACTIVE';
