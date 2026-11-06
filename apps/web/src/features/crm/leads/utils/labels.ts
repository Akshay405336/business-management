import type { LeadActivityType, LeadPriority, LeadSource } from '../types/lead.types';

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const labelLeadPriority = (priority: LeadPriority): string => titleCase(priority);
export const labelLeadSource = (source: LeadSource): string => titleCase(source);
export const labelActivityType = (type: LeadActivityType): string => titleCase(type);
