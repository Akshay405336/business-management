'use client';

import type { OrgCalendarMonthDay } from '@techwin/contracts';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendanceOrgTimeZone } from '@/features/admin/attendance/hooks/use-attendance-org-timezone';
import {
  monthBounds,
  todayKeyInTimeZone,
} from '@/features/admin/attendance/utils/calendar-month';
import { fetchEmployeeOrgCalendarMonth } from '@/features/admin/org-calendar/api/org-calendar-api';
import { CRM_PIPELINE_FORM_FIELD_CLASS } from '@/features/admin/crm/constants';
import { isAbortError } from '@/shared/lib/abort-error';
import { cn } from '@/shared/lib/utils';
import {
  describeLeaveDateDisabledReason,
  expandInclusiveCalendarRange,
  formatDateKeyForDisplay,
  formatSelectedDatesCompactSummary,
  isOrgDayEligibleForLeave,
  normalizeSelectedDateKeys,
} from '../constants/leave-calendar-date';
import {
  LeaveMultiDateCalendarGrid,
  LeaveMultiDateCalendarLegend,
} from './leave-multi-date-calendar-grid';

const SECONDARY_BTN =
  'h-10 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground shadow-none hover:bg-muted/50';

function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, monthIndex } = monthBounds(monthKey);
  const d = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthTitle(monthKey: string): string {
  const { year, monthIndex } = monthBounds(monthKey);
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function LeaveMultiDatePickerDialog({
  open,
  onOpenChange,
  appliedDates,
  onApply,
  policyYearStartDate,
  policyYearEndDate,
  isHalfDay,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedDates: readonly string[];
  onApply: (dates: readonly string[]) => void;
  policyYearStartDate: string | null;
  policyYearEndDate: string | null;
  isHalfDay: boolean;
  disabled?: boolean;
}) {
  const orgTimeZone = useAttendanceOrgTimeZone();
  const orgTodayKey = useMemo(() => todayKeyInTimeZone(orgTimeZone), [orgTimeZone]);
  const [draftDates, setDraftDates] = useState<string[]>([]);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);
  const anchorKey = appliedDates[0] ?? orgTodayKey;
  const [monthKey, setMonthKey] = useState(anchorKey.slice(0, 7));
  const { year, monthIndex } = monthBounds(monthKey);
  const [daysByDate, setDaysByDate] = useState<Map<string, OrgCalendarMonthDay>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraftDates(normalizeSelectedDateKeys(appliedDates));
    setRangeAnchor(null);
    setMonthKey((appliedDates[0] ?? orgTodayKey).slice(0, 7));
  }, [open, appliedDates, orgTodayKey]);

  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setLoadError(null);
    void fetchEmployeeOrgCalendarMonth({ year, month: monthIndex + 1 }, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        const map = new Map<string, OrgCalendarMonthDay>();
        for (const day of response.days) map.set(day.date, day);
        setDaysByDate(map);
      })
      .catch((err) => {
        if (isAbortError(err) || controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load calendar.');
        setDaysByDate(new Map());
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, year, monthIndex]);

  const selectedSet = useMemo(() => new Set(draftDates), [draftDates]);

  const rangeLabel = useMemo(() => {
    if (draftDates.length === 0) return null;
    const start = draftDates[0]!;
    const end = draftDates[draftDates.length - 1]!;
    if (start === end) return formatDateKeyForDisplay(start);
    return `${formatDateKeyForDisplay(start)} – ${formatDateKeyForDisplay(end)}`;
  }, [draftDates]);

  const canSelectDate = useCallback(
    (dateKey: string, day: OrgCalendarMonthDay | undefined) => {
      if (dateKey < orgTodayKey) return false;
      if (policyYearStartDate && dateKey < policyYearStartDate) return false;
      if (policyYearEndDate && dateKey > policyYearEndDate) return false;
      return isOrgDayEligibleForLeave(day, isHalfDay);
    },
    [isHalfDay, orgTodayKey, policyYearEndDate, policyYearStartDate],
  );

  const disabledDateTitle = useCallback(
    (dateKey: string, day: OrgCalendarMonthDay | undefined) =>
      describeLeaveDateDisabledReason({
        dateKey,
        day,
        policyYearStartDate,
        policyYearEndDate,
        minDateKey: rangeAnchor,
        orgTodayKey,
      }),
    [orgTodayKey, policyYearEndDate, policyYearStartDate, rangeAnchor],
  );

  const pickDate = (dateKey: string) => {
    const day = daysByDate.get(dateKey);
    if (!canSelectDate(dateKey, day)) return;

    if (!rangeAnchor) {
      setRangeAnchor(dateKey);
      setDraftDates([dateKey]);
      return;
    }

    const start = rangeAnchor < dateKey ? rangeAnchor : dateKey;
    const end = rangeAnchor < dateKey ? dateKey : rangeAnchor;
    setDraftDates(expandInclusiveCalendarRange(start, end));
    setRangeAnchor(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,780px)] w-[min(680px,calc(100vw-2rem))] max-w-none flex-col gap-0 p-0 sm:max-w-[min(680px,calc(100vw-2rem))]"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-border shrink-0 space-y-0 border-b px-4 py-3 text-left">
          <DialogTitle className="text-base font-semibold">Select leave dates</DialogTitle>
          <p className="text-muted-foreground pt-1 text-xs">
            Choose a start date, then an end date. Weekends and holidays in the range are excluded when
            leave is calculated.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {rangeLabel ? (
            <p className="text-foreground mb-3 text-sm font-medium">{rangeLabel}</p>
          ) : (
            <p className="text-muted-foreground mb-3 text-xs">No date range selected yet.</p>
          )}

          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Previous month"
              onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <p className="text-sm font-semibold">{monthTitle(monthKey)}</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Next month"
              onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>

          {loadError ? <p className="mb-2 text-sm text-destructive">{loadError}</p> : null}
          {loading ? (
            <Skeleton className="mb-3 h-[360px] w-full rounded-xl" />
          ) : (
            <LeaveMultiDateCalendarGrid
              year={year}
              monthIndex={monthIndex}
              daysByDate={daysByDate}
              selectedDates={selectedSet}
              orgTodayKey={orgTodayKey}
              canSelectDate={canSelectDate}
              disabledDateTitle={disabledDateTitle}
              onToggleDate={pickDate}
            />
          )}
          <div className="mt-3">
            <LeaveMultiDateCalendarLegend />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-2 text-sm"
            disabled={disabled}
            onClick={() => {
              setDraftDates([]);
              setRangeAnchor(null);
            }}
          >
            Clear selection
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" className={SECONDARY_BTN} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 border-0 bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-950 px-4 text-sm font-medium text-white"
              disabled={draftDates.length === 0}
              onClick={() => {
                onApply(draftDates);
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LeaveDatesFieldTrigger({
  id,
  value,
  onClick,
  disabled,
}: {
  id: string;
  value: readonly string[];
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      id={id}
      variant="outline"
      disabled={disabled}
      className={cn(
        CRM_PIPELINE_FORM_FIELD_CLASS,
        'h-11 w-full justify-start gap-2 px-3 font-normal',
        value.length === 0 && 'text-muted-foreground',
      )}
      onClick={onClick}
    >
      <CalendarDays className="size-4 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">
        {value.length > 0 ? formatSelectedDatesCompactSummary(value) : 'Select leave date or range'}
      </span>
    </Button>
  );
}
