import type { EmployeeEmploymentStatus, EmployeeEmploymentType } from '../types';

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelEmployeeStatus = (status: EmployeeEmploymentStatus): string => titleCase(status);

export const labelEmploymentType = (type: EmployeeEmploymentType): string => titleCase(type);
