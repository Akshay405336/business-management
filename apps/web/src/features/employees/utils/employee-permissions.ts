export const EMPLOYEE_PERMISSIONS = {
  read: 'employees.read',
  create: 'employees.create',
  update: 'employees.update',
  compensationRead: 'employees.compensation.read',
  compensationManage: 'employees.compensation.manage',
} as const;

type EmployeePermission = (typeof EMPLOYEE_PERMISSIONS)[keyof typeof EMPLOYEE_PERMISSIONS];
type PermissionCheck = (permission: EmployeePermission) => boolean;

export function canReadEmployees(has: PermissionCheck): boolean {
  return has(EMPLOYEE_PERMISSIONS.read);
}

export function canCreateEmployees(has: PermissionCheck): boolean {
  return has(EMPLOYEE_PERMISSIONS.create);
}

export function canUpdateEmployees(has: PermissionCheck): boolean {
  return has(EMPLOYEE_PERMISSIONS.update);
}

export function canReadEmployeeCompensation(has: PermissionCheck): boolean {
  return has(EMPLOYEE_PERMISSIONS.compensationRead);
}

export function canManageEmployeeCompensation(has: PermissionCheck): boolean {
  return has(EMPLOYEE_PERMISSIONS.compensationManage);
}
