'use client';

import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, inputGroupPaddingClass } from '@/components/ui/input-group';
import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_SEARCH_INPUT_CLASS } from '@/features/admin/crm/constants';

export function TaskCalendarToolbar({
  monthKey,
  search,
  searchInFlight,
  onSearchChange,
  onPrevMonth,
  onNextMonth,
  onMonthKeyChange,
  filters,
  filtersBusy,
  className,
}: {
  monthKey: string;
  search: string;
  /** Debounced search request in flight — spinner in field only. */
  searchInFlight?: boolean;
  onSearchChange: (v: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthKeyChange: (monthKey: string) => void;
  /** Filter + Employee + Priority icon buttons (CRM pipeline style). */
  filters: ReactNode;
  /** Background refetch after filter change (not search — search uses searchInFlight). */
  filtersBusy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:gap-2',
        'sm:flex-nowrap sm:overflow-hidden',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Previous month"
          title="Previous month"
          onClick={onPrevMonth}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Input
          type="month"
          value={monthKey}
          aria-label="Select month"
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d{4}-\d{2}$/.test(v)) onMonthKeyChange(v);
          }}
          className="h-9 w-[10.5rem] min-w-[9rem] shrink-0 cursor-pointer rounded-lg font-medium tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label="Next month"
          title="Next month"
          onClick={onNextMonth}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div className="min-w-0 flex-1 basis-[min(100%,8.5rem)] sm:min-w-[7rem]">
        <InputGroup
          leading={<Search aria-hidden className="size-4 shrink-0" />}
          trailing={
            searchInFlight ? (
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null
          }
          className="min-w-0 w-full max-w-full"
        >
          <Input
            className={cn(
              CRM_PIPELINE_SEARCH_INPUT_CLASS,
              inputGroupPaddingClass({ leading: true, trailing: searchInFlight }),
              'min-w-0 max-w-full',
            )}
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search tasks"
          />
        </InputGroup>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {filters}
        {filtersBusy ? (
          <Loader2
            aria-label="Updating calendar"
            role="status"
            className="size-3.5 shrink-0 animate-spin text-muted-foreground"
          />
        ) : null}
      </div>
    </div>
  );
}
