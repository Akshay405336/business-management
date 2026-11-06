'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TaskCalendarResponse } from '@techwin/contracts';
import { localDateInputValue } from '@/features/admin/daily-tasks/utils/local-date';
import { fetchTaskCalendar } from '../api/task-calendar.api';
import type { TaskCalendarPageSearch } from '../schemas/task-calendar.schema';
import type { TaskCalendarRequestQuery } from '../types/task-calendar.types';
import { visibleGridRange } from '../utils/calendar-date.utils';
import { dayMapFromResponse } from '../utils/calendar-task.utils';

/** Debounced search → API (URL sync on page may use a separate delay). */
const SEARCH_DEBOUNCE_MS = 350;

type FetchCause = 'initial' | 'month' | 'search' | 'filter';

function filterSignature(f: TaskCalendarPageSearch): string {
  return JSON.stringify({
    employeeId: f.employeeId,
    type: f.type,
    source: f.source,
    priority: f.priority,
    status: f.status,
    displayStatus: f.displayStatus,
  });
}

export function useCalendarTasks(monthKey: string, filters: TaskCalendarPageSearch) {
  const [data, setData] = useState<TaskCalendarResponse | null>(null);
  /** Month key of the response currently in `data`. Null until the first success. */
  const [dataMonthKey, setDataMonthKey] = useState<string | null>(null);
  /** True until the first successful response. */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchCause, setFetchCause] = useState<FetchCause>('initial');
  const [error, setError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [trackedMonthKey, setTrackedMonthKey] = useState(monthKey);
  if (trackedMonthKey !== monthKey) {
    setTrackedMonthKey(monthKey);
    setError(false);
  }

  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search ?? '');
  const clientToday = useMemo(() => localDateInputValue(), []);

  const fetchSeqRef = useRef(0);
  const hasSucceededRef = useRef(false);

  /** Last completed fetch identity (for cause detection). */
  const lastCompletedRef = useRef<{
    monthKey: string;
    debouncedSearch: string;
    filterSig: string;
  } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local search with URL-driven filter
    setSearchDraft(filters.search ?? '');
    setDebouncedSearch(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchDraft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchDraft]);

  const buildQuery = useCallback((): TaskCalendarRequestQuery | null => {
    const grid = visibleGridRange(monthKey);
    if (!grid) return null;
    const q: TaskCalendarRequestQuery = {
      clientToday,
      startDate: grid.startDate,
      endDate: grid.endDate,
      search: debouncedSearch.trim() || undefined,
    };
    if (filters.employeeId) q.employeeId = filters.employeeId;
    if (filters.type) q.type = filters.type;
    if (filters.source) q.source = filters.source;
    if (filters.priority) {
      if (filters.source === 'PROJECT_TASK') q.projectTaskPriority = filters.priority;
      else q.priority = filters.priority;
    }
    if (filters.status) q.status = filters.status;
    if (filters.displayStatus) q.displayStatus = filters.displayStatus;
    return q;
  }, [
    monthKey,
    clientToday,
    debouncedSearch,
    filters.employeeId,
    filters.type,
    filters.source,
    filters.priority,
    filters.status,
    filters.displayStatus,
  ]);

  const filterSig = useMemo(() => filterSignature(filters), [filters]);

  useEffect(() => {
    const ac = new AbortController();
    const query = buildQuery();
    if (!query) return undefined;

    const prev = lastCompletedRef.current;
    let cause: FetchCause = 'initial';
    if (hasSucceededRef.current && prev) {
      if (prev.monthKey !== monthKey) cause = 'month';
      else if (prev.debouncedSearch !== debouncedSearch) cause = 'search';
      else if (prev.filterSig !== filterSig) cause = 'filter';
      else cause = 'filter';
    }

    const seq = ++fetchSeqRef.current;
    setFetchCause(cause);
    setIsFetching(true);
    setError(false);

    fetchTaskCalendar(query, ac.signal)
      .then((res) => {
        if (ac.signal.aborted || seq !== fetchSeqRef.current) return;
        setData(res);
        setDataMonthKey(monthKey);
        hasSucceededRef.current = true;
        lastCompletedRef.current = { monthKey, debouncedSearch, filterSig };
        setIsInitialLoading(false);
      })
      .catch(() => {
        if (ac.signal.aborted || seq !== fetchSeqRef.current) return;
        setError(true);
        if (!hasSucceededRef.current) {
          setData(null);
        }
        setIsInitialLoading(false);
      })
      .finally(() => {
        if (ac.signal.aborted || seq !== fetchSeqRef.current) return;
        setIsFetching(false);
      });

    return () => ac.abort();
  }, [buildQuery, monthKey, debouncedSearch, filterSig, retryNonce]);

  const monthDataReady = data !== null && dataMonthKey === monthKey;
  const daysByDate = useMemo(
    () => (monthDataReady && data ? dayMapFromResponse(data.days) : new Map()),
    [data, monthDataReady],
  );

  const isSearching = isFetching && fetchCause === 'search';
  const isFiltering = isFetching && fetchCause === 'filter';
  /** Search and filters keep the current month on screen. Month changes use the grid skeleton. */
  const isCalendarAreaRefreshing = isFetching && (fetchCause === 'filter' || fetchCause === 'search') && monthDataReady;
  /** No successful payload for this month yet — skeleton cells, not empty “No tasks” days. */
  const showGridSkeleton = !monthDataReady && !error;

  const retry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  return {
    data: monthDataReady ? data : null,
    daysByDate,
    isInitialLoading,
    isFetching,
    isSearching,
    isFiltering,
    isCalendarAreaRefreshing,
    showGridSkeleton,
    fetchCause,
    error,
    retry,
    searchDraft,
    setSearchDraft,
    clientToday,
  };
}
