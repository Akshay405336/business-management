'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { addDaysToDateInput } from '../utils/local-date';

export function DailyTaskDateNavigation({
  assignDate,
  onAssignDateChange,
  className,
}: {
  assignDate: string;
  onAssignDateChange: (next: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label="Previous day"
        title="Previous day"
        onClick={() => onAssignDateChange(addDaysToDateInput(assignDate, -1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      <Input
        type="date"
        value={assignDate}
        aria-label="Selected date"
        onChange={(e) => onAssignDateChange(e.target.value)}
        className="h-9 w-[min(13.5rem,100%)] min-w-[12.5rem] shrink-0 cursor-pointer rounded-lg font-medium tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label="Next day"
        title="Next day"
        onClick={() => onAssignDateChange(addDaysToDateInput(assignDate, 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
