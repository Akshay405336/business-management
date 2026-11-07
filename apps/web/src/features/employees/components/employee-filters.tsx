'use client';

import { Briefcase, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { EMPLOYEE_EMPLOYMENT_TYPES, EMPLOYEE_STATUSES } from '../constants';
import type { EmployeeEmploymentStatus, EmployeeEmploymentType } from '../types';
import { labelEmployeeStatus, labelEmploymentType } from '../utils/employee-formatters';

type StatusFilter = 'ALL' | EmployeeEmploymentStatus;
type TypeFilter = 'ALL' | EmployeeEmploymentType;

export function EmployeeStatusFilter({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) {
  const active = value !== 'ALL';
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn('shrink-0', active && 'border-primary/40 bg-primary/5')}
              aria-label="Filter by status"
            >
              <ListFilter aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Status</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Employment status</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as StatusFilter)}>
          <DropdownMenuRadioItem value="ALL">All statuses</DropdownMenuRadioItem>
          {EMPLOYEE_STATUSES.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              {labelEmployeeStatus(status)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EmployeeTypeFilter({
  value,
  onChange,
}: {
  value: TypeFilter;
  onChange: (value: TypeFilter) => void;
}) {
  const active = value !== 'ALL';
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn('shrink-0', active && 'border-primary/40 bg-primary/5')}
              aria-label="Filter by employment type"
            >
              <Briefcase aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Employment type</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Employment type</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as TypeFilter)}>
          <DropdownMenuRadioItem value="ALL">All types</DropdownMenuRadioItem>
          {EMPLOYEE_EMPLOYMENT_TYPES.map((type) => (
            <DropdownMenuRadioItem key={type} value={type}>
              {labelEmploymentType(type)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
