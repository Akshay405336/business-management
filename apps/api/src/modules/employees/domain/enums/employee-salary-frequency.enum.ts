export const EMPLOYEE_SALARY_FREQUENCIES = ['MONTHLY', 'ANNUAL'] as const;

export type EmployeeSalaryFrequency = (typeof EMPLOYEE_SALARY_FREQUENCIES)[number];
