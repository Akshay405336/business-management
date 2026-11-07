'use client';

import type { AttendanceRecordDetail, AttendanceRecordItem } from '@techwin/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminToast } from '@/features/admin/components/toast';
import {
  fetchAttendanceRecordDetail,
  fetchAttendanceSettings,
  listAttendanceRecords,
} from '@/features/attendance/api/attendance';
import { isAbortError } from '@/shared/lib/abort-error';
import { subscribeOrgCalendarSync } from '@/features/admin/org-calendar/lib/org-calendar-sync';
import { addDaysToDateKey } from '@/features/attendance/utils/time';
import { localTodayKey, todayKeyInTimeZone } from '../utils/calendar-month';
import type { AttendanceStatusFilter } from '../constants/attendance-status-filter-options';

const SEARCH_DEBOUNCE_MS = 400;
export const ATTENDANCE_DEFAULT_PAGE_SIZE = 10;

function describeAttendanceError(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'Failed to load attendance records.';
}

export function useAttendanceRecordsList(active: boolean) {
  const toast = useAdminToast();

  const [items, setItems] = useState<readonly AttendanceRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ATTENDANCE_DEFAULT_PAGE_SIZE);

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('ALL');
  const [visibleMonth, setVisibleMonth] = useState(() => localTodayKey().slice(0, 7));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0);
  const [orgTimeZone, setOrgTimeZone] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orgTodayKey = useMemo(
    () => (orgTimeZone ? todayKeyInTimeZone(orgTimeZone) : null),
    [orgTimeZone],
  );

  const queryDate = date || orgTodayKey || '';

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    (orgTodayKey != null && queryDate !== orgTodayKey);

  const queryKey = useMemo(
    () => ({
      page,
      pageSize,
      search: search.trim() || undefined,
      date: queryDate || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    [page, pageSize, search, queryDate, statusFilter],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchAttendanceSettings().then((settings) => {
      if (cancelled) return;
      setOrgTimeZone(settings.current?.timeZone?.trim() || 'UTC');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orgTodayKey || date !== '') return;
    setDate(orgTodayKey);
    setSelectedCalendarDate(orgTodayKey);
    setVisibleMonth(orgTodayKey.slice(0, 7));
  }, [date, orgTodayKey]);

  const load = useCallback(async () => {
    if (!active || !queryDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listAttendanceRecords(queryKey);
      setItems(response.items);
      setTotal(response.total);
    } catch (failure) {
      setError(describeAttendanceError(failure));
    } finally {
      setLoading(false);
    }
  }, [active, queryDate, queryKey]);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    if (!queryDate) {
      setLoading(true);
      return;
    }
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listAttendanceRecords(queryKey, controller.signal);
        if (controller.signal.aborted) return;
        setItems(response.items);
        setTotal(response.total);
      } catch (failure) {
        if (controller.signal.aborted || isAbortError(failure)) return;
        setError(describeAttendanceError(failure));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [active, queryDate, queryKey]);

  useEffect(() => {
    if (!active) return;
    return subscribeOrgCalendarSync(() => {
      setCalendarRefreshToken((token) => token + 1);
    });
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [active, searchDraft]);

  const setDateFilter = useCallback((value: string) => {
    setDate(value);
    setPage(1);
    if (value) {
      setSelectedCalendarDate(value);
      setVisibleMonth(value.slice(0, 7));
    }
  }, []);

  const shiftDateByDays = useCallback(
    (deltaDays: number) => {
      const current = queryDate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(current)) return;
      const next = addDaysToDateKey(current, deltaDays);
      if (next === current) return;
      setDateFilter(next);
    },
    [queryDate, setDateFilter],
  );

  const setStatusFilterAndResetPage = useCallback((value: AttendanceStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchDraft('');
    setSearch('');
    const resetDate = orgTodayKey ?? date;
    setDate(resetDate);
    setStatusFilter('ALL');
    if (resetDate) {
      setSelectedCalendarDate(resetDate);
      setVisibleMonth(resetDate.slice(0, 7));
    }
    setPage(1);
  }, [date, orgTodayKey]);

  const refreshAll = useCallback(() => {
    void load();
    setCalendarRefreshToken((token) => token + 1);
  }, [load]);

  const selectCalendarDate = useCallback((value: string) => {
    setSelectedCalendarDate(value);
    setDate(value);
    setVisibleMonth(value.slice(0, 7));
    setPage(1);
  }, []);

  const openDetail = useCallback(
    async (recordId: string): Promise<AttendanceRecordDetail | null> => {
      try {
        return await fetchAttendanceRecordDetail(recordId);
      } catch (failure) {
        toast.error(describeAttendanceError(failure));
        return null;
      }
    },
    [toast],
  );

  const refreshing = loading && items.length > 0;

  return {
    items,
    total,
    loading,
    refreshing,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    searchDraft,
    setSearchDraft,
    date,
    datePickerValue: queryDate,
    orgTodayKey,
    setDateFilter,
    shiftDateByDays,
    statusFilter,
    setStatusFilter: setStatusFilterAndResetPage,
    filtersActive,
    clearFilters,
    load,
    refreshAll,
    safePage,
    totalPages,
    openDetail,
    describeAttendanceError,
    visibleMonth,
    setVisibleMonth,
    selectedCalendarDate,
    setSelectedCalendarDate,
    selectCalendarDate,
    calendarRefreshToken,
    search,
  };
}

export type AttendanceRecordsListState = ReturnType<typeof useAttendanceRecordsList>;
