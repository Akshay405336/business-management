'use client';

import type { AttendanceCalendarDaySummary } from '@techwin/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchAttendanceCalendar } from '@/features/attendance/api/attendance';
import { isAbortError } from '@/shared/lib/abort-error';
import type { AttendanceStatusFilter } from '../constants/attendance-status-filter-options';
import { monthBoardVisibleRange, monthBounds } from '../utils/calendar-month';

const monthCache = new Map<string, readonly AttendanceCalendarDaySummary[]>();

function cacheKey(from: string, to: string, search: string, status: AttendanceStatusFilter): string {
  return `${from}|${to}|${search.trim()}|${status}`;
}

export function useAttendanceCalendarMonth(input: {
  visibleMonth: string;
  search: string;
  statusFilter: AttendanceStatusFilter;
  calendarRefreshToken: number;
  enabled?: boolean;
  /** Include leading/trailing board dates in the API range. */
  expandToBoard?: boolean;
}) {
  const enabled = input.enabled ?? true;
  const [days, setDays] = useState<readonly AttendanceCalendarDaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const requestSeq = useRef(0);

  const range = useMemo(() => {
    const month = monthBounds(input.visibleMonth);
    if (!input.expandToBoard) return month;
    return monthBoardVisibleRange(month.year, month.monthIndex);
  }, [input.visibleMonth, input.expandToBoard]);
  const key = useMemo(
    () => cacheKey(range.from, range.to, input.search, input.statusFilter),
    [range.from, range.to, input.search, input.statusFilter],
  );

  const lastRefreshToken = useRef(input.calendarRefreshToken);
  useEffect(() => {
    if (lastRefreshToken.current !== input.calendarRefreshToken) {
      monthCache.clear();
      lastRefreshToken.current = input.calendarRefreshToken;
    }
  }, [input.calendarRefreshToken]);

  const retry = useCallback(() => {
    monthCache.delete(key);
    setRetryNonce((value) => value + 1);
  }, [key]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const seq = ++requestSeq.current;
    const cached = monthCache.get(key);

    if (cached) {
      setDays(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    void (async () => {
      try {
        const response = await fetchAttendanceCalendar(
          {
            from: range.from,
            to: range.to,
            search: input.search.trim() || undefined,
            status: input.statusFilter === 'ALL' ? undefined : input.statusFilter,
          },
          controller.signal,
        );
        if (seq !== requestSeq.current) return;
        monthCache.set(key, response.days);
        setDays(response.days);
        setError(null);
      } catch (failure) {
        if (isAbortError(failure) || seq !== requestSeq.current) return;
        setError(failure instanceof Error ? failure.message : 'Failed to load calendar.');
        if (!cached) setDays([]);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [enabled, key, range.from, range.to, input.search, input.statusFilter, input.calendarRefreshToken, retryNonce]);

  return { days, loading, error, retry, range };
}
