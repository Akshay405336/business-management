export const EMPLOYEE_EMPLOYMENT_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
] as const;

export type EmployeeEmploymentType = (typeof EMPLOYEE_EMPLOYMENT_TYPES)[number];
