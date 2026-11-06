'use client';

import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';

export type DailyTaskSortBy = 'priority' | 'dueDate' | 'assignDate' | 'title' | 'updatedAt';
export type DailyTaskSortDir = 'asc' | 'desc';

const SORT_FIELDS: readonly { value: DailyTaskSortBy; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'assignDate', label: 'Assign date' },
  { value: 'title', label: 'Title' },
  { value: 'updatedAt', label: 'Last updated' },
];

const SORT_DIRS: readonly { value: DailyTaskSortDir; label: string }[] = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

const DEFAULT_SORT_BY: DailyTaskSortBy = 'priority';
const DEFAULT_SORT_DIR: DailyTaskSortDir = 'desc';

/** Matches CRM Pipeline toolbar: Tooltip + icon button + DropdownMenu. */
export function DailyTaskSort({
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirChange,
}: {
  sortBy: DailyTaskSortBy;
  sortDir: DailyTaskSortDir;
  onSortByChange: (value: DailyTaskSortBy) => void;
  onSortDirChange: (value: DailyTaskSortDir) => void;
}) {
  const active = sortBy !== DEFAULT_SORT_BY || sortDir !== DEFAULT_SORT_DIR;
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
              aria-label="Sort"
            >
              <ArrowUpDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Sort</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortBy}
          onValueChange={(v) => onSortByChange(v as DailyTaskSortBy)}
        >
          {SORT_FIELDS.map((field) => (
            <DropdownMenuRadioItem key={field.value} value={field.value}>
              {field.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortDir}
          onValueChange={(v) => onSortDirChange(v as DailyTaskSortDir)}
        >
          {SORT_DIRS.map((dir) => (
            <DropdownMenuRadioItem key={dir.value} value={dir.value}>
              {dir.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
