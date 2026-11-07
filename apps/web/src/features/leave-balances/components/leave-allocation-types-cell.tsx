'use client';

import type { LeaveYearConfigurationAllocationSummary } from '@techwin/contracts';
import { useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { formatAllocationDaysLabel } from '../utils/format-allocation-days-label';

function AllocationLine({
  name,
  days,
  className,
}: {
  name: string;
  days: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap text-sm', className)}>
      <span className="text-foreground">{name}</span>
      <span className="text-muted-foreground">
        {' · '}
        {formatAllocationDaysLabel(days)}
      </span>
    </span>
  );
}

function LeaveAllocationMoreTrigger({
  remaining,
  remainingCount,
}: {
  remaining: readonly LeaveYearConfigurationAllocationSummary[];
  remainingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverClose = () => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const moreLabel = `+${remainingCount} more`;
  const ariaLabel = `Show ${remainingCount} more leave type allocation${remainingCount === 1 ? '' : 's'}`;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen((value) => !value);
            }
          }}
          onMouseEnter={() => {
            clearHoverClose();
            setOpen(true);
          }}
          onMouseLeave={() => {
            clearHoverClose();
            hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-pointer items-center border-0 bg-transparent p-0 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {moreLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="z-[100] w-[min(calc(100vw-1.5rem),18rem)] border border-border bg-card p-2 shadow-md"
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => {
          clearHoverClose();
          setOpen(true);
        }}
        onMouseLeave={() => {
          clearHoverClose();
          hoverCloseTimer.current = setTimeout(() => setOpen(false), 120);
        }}
      >
        <ul className="flex flex-col gap-1.5" role="list">
          {remaining.map((line) => (
            <li key={line.leaveTypeId} className="min-w-0">
              <AllocationLine name={line.leaveTypeName} days={line.annualAllocationDays} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function LeaveAllocationTypesCell({
  allocations,
}: {
  allocations: readonly LeaveYearConfigurationAllocationSummary[];
}) {
  if (allocations.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const first = allocations[0];
  const rest = allocations.slice(1);
  if (!first) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return (
    <div className="flex w-max max-w-full items-center gap-1.5 whitespace-nowrap align-middle">
      <AllocationLine
        name={first.leaveTypeName}
        days={first.annualAllocationDays}
        className="shrink-0"
      />
      {rest.length > 0 ? (
        <LeaveAllocationMoreTrigger remaining={rest} remainingCount={rest.length} />
      ) : null}
    </div>
  );
}
