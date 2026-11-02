import type { EmployeeDeletionLoginOutcome, EmployeeLoginAccess } from '@techwin/contracts';
import type { EmployeeEmploymentStatus, EmployeeEmploymentType } from '../types';

export const describeEmployeeDeletion = (outcome: EmployeeDeletionLoginOutcome): string => {
  switch (outcome) {
    case 'ACCOUNT_DELETED':
      return 'Employee and their login account were permanently deleted.';
    case 'MEMBERSHIP_REMOVED':
      return 'Employee permanently deleted. Their login account was removed from this organization but is still used by another organization.';
    case 'ACCOUNT_PRESERVED':
      return 'Employee permanently deleted. Their login account was kept because it was not created for this employee.';
    default:
      return 'Employee permanently deleted.';
  }
};

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelEmployeeStatus = (status: EmployeeEmploymentStatus): string => titleCase(status);

export const labelEmploymentType = (type: EmployeeEmploymentType): string => titleCase(type);

export const labelLoginStatus = (access: EmployeeLoginAccess | null): string =>
  access ? titleCase(access.status) : 'No login';

export const labelLoginRoles = (access: EmployeeLoginAccess | null): string => {
  if (!access) return '—';
  if (access.isOwner && access.roles.length === 0) return 'Owner';
  return access.roles.map((role) => role.name).join(', ') || 'No role';
};

export function loginStatusBadgeClass(access: EmployeeLoginAccess | null): string {
  switch (access?.status) {
    case 'ACTIVE':
      return 'border-transparent bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/10';
    case 'SUSPENDED':
    case 'INVITED':
      return 'border-transparent bg-amber-600/10 text-amber-800 hover:bg-amber-600/10';
    case 'DEACTIVATED':
      return 'border-transparent bg-red-600/10 text-red-700 hover:bg-red-600/10';
    default:
      return 'border-transparent bg-neutral-500/10 text-neutral-600 hover:bg-neutral-500/10';
  }
}
