'use client';

import type { ReactNode } from 'react';
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

export type CrmFilterOption = { readonly value: string; readonly label: string };

const ALL_VALUE = 'all';

/**
 * CRM Pipeline–style single filter: icon button, hover tooltip, one dropdown with only this filter's options.
 * Shared by Task Calendar, Daily Tasks, and similar toolbars.
 */
export function CrmIconFilterDropdown({
  icon,
  tooltip,
  label,
  allLabel,
  value,
  options,
  onValueChange,
  disabled,
  contentClassName,
}: {
  icon: ReactNode;
  tooltip: string;
  label: string;
  allLabel: string;
  /** Selection; use ALL_VALUE (`'all'`) for “no filter”. */
  value: string;
  options: readonly CrmFilterOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  contentClassName?: string;
}) {
  const active = value !== ALL_VALUE;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              className={cn('shrink-0', active && 'border-primary/40 bg-primary/5')}
              aria-label={tooltip}
            >
              {icon}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className={cn('max-h-72 w-52 overflow-y-auto', contentClassName)}
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          <DropdownMenuRadioItem value={ALL_VALUE}>{allLabel}</DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
