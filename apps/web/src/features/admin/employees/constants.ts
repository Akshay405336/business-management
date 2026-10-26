import type { EmployeeEmploymentStatus, EmployeeEmploymentType } from './types';

export const EMPLOYEE_STATUSES: readonly EmployeeEmploymentStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'ON_LEAVE',
  'TERMINATED',
] as const;

export const EMPLOYEE_EMPLOYMENT_TYPES: readonly EmployeeEmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
] as const;

export const DEFAULT_EMPLOYEE_PAGE_SIZE = 10;
