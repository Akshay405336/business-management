'use client';

import type { ReactNode } from 'react';
import {
  CrmIconFilterDropdown,
  type CrmFilterOption,
} from '@/components/shared/crm-icon-filter-dropdown';

/** @deprecated Use CrmFilterOption from shared crm-icon-filter-dropdown */
export type TaskCalendarFilterOption = CrmFilterOption;

export function TaskCalendarFilterMenu({
  icon,
  tooltip,
  label,
  allLabel,
  value,
  options,
  onValueChange,
  disabled,
}: {
  icon: ReactNode;
  tooltip: string;
  label: string;
  allLabel: string;
  value: string;
  options: readonly CrmFilterOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <CrmIconFilterDropdown
      icon={icon}
      tooltip={tooltip}
      label={label}
      allLabel={allLabel}
      value={value}
      options={options}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  );
}
