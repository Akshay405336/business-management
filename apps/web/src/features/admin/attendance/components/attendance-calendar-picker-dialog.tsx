'use client';

import { CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { useAttendanceRecordsContext } from './attendance-records-context';
import { AttendanceCalendarMonthGrid } from './attendance-calendar-month-grid';

/** Overrides DialogContent default `max-w-lg` / `sm:max-w-lg` and Pipeline 720px cap. */
const DIALOG_SHELL = cn(
  'flex w-[min(1000px,calc(100vw-40px))] max-w-none flex-col gap-0 overflow-visible p-0 sm:max-h-[95vh] sm:overflow-y-auto',
  'sm:max-w-[min(1000px,calc(100vw-40px))]',
  '[&>button]:text-foreground [&>button]:top-4 [&>button]:right-4 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50',
);

export function AttendanceCalendarPickerDialog({
  open,
  onOpenChange,
  onDateApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateApplied: () => void;
}) {
  const ctx = useAttendanceRecordsContext();
  const selectedDate = ctx.datePickerValue || ctx.selectedCalendarDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_SHELL} aria-describedby={undefined}>
        <DialogHeader className="border-border space-y-0 border-b px-4 py-2.5 text-left sm:px-5">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg border border-[#E8E8EF] bg-[#F8F9FC] shadow-xs">
              <CalendarDays className="text-primary size-4" aria-hidden="true" />
            </span>
            Attendance calendar
          </DialogTitle>
        </DialogHeader>

        <AttendanceCalendarMonthGrid
          enabled={open}
          variant="popup"
          selectedDate={selectedDate}
          onDateSelect={(dateKey) => {
            ctx.setDateFilter(dateKey);
            onDateApplied();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
