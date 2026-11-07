export const EMPLOYEE_EMPLOYMENT_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'TERMINATED',
] as const;

export type EmployeeEmploymentStatus = (typeof EMPLOYEE_EMPLOYMENT_STATUSES)[number];
