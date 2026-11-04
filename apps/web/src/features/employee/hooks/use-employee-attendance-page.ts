'use client';

import type { AttendanceListResponse, AttendanceMyTodayResponse } from '@techwin/contracts';
import type { AttendanceHistoryQuery } from '@techwin/validation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminToast } from '@/features/admin/components/toast';
import type { AttendanceStatusFilter } from '@/features/admin/attendance/constants/attendance-status-filter-options';
import { todayKeyInTimeZone } from '@/features/admin/attendance/utils/calendar-month';
import {
  fetchMyAttendanceHistory,
  fetchMyTodayAttendance,
  punchIn,
  punchOut,
  registerAttendanceDevice,
} from '@/features/attendance/api/attendance';
import { useAttendanceDeviceKey } from '@/features/attendance/hooks/use-attendance-device-key';
import { addDaysToDateKey } from '@/features/attendance/utils/time';
import { usePermissions } from '@/features/auth/components/permissions-provider';
import { isAbortError } from '@/shared/lib/abort-error';
import { isApiError } from '@/shared/api/api-error';

const HISTORY_LOOKBACK_DAYS = 90;
const DEFAULT_PAGE_SIZE = 10;

function describeError(failure: unknown): string {
  return failure instanceof Error ? failure.message : 'Something went wrong.';
}

async function retryAfterAccessRefresh<T>(
  action: () => Promise<T>,
  refreshPermissions: () => Promise<void>,
): Promise<T> {
  try {
    return await action();
  } catch (failure) {
    if (!isApiError(failure) || failure.status !== 403) throw failure;
    await refreshPermissions();
    return action();
  }
}

export function useEmployeeAttendancePage() {
  const toast = useAdminToast();
  const { refresh: refreshPermissions } = usePermissions();
  const deviceKey = useAttendanceDeviceKey();

  const [today, setToday] = useState<AttendanceMyTodayResponse | null>(null);
  const [history, setHistory] = useState<AttendanceListResponse | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [punchAction, setPunchAction] = useState<'in' | 'out' | null>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());

  const [filterDate, setFilterDate] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const serverSkewMs = useRef(0);
  const historyDefaultsSet = useRef(false);

  const timeZone = today?.schedule?.timeZone ?? 'UTC';
  const orgTodayKey = useMemo(() => todayKeyInTimeZone(timeZone), [timeZone, today?.attendanceDate]);

  const historyQuery = useMemo((): AttendanceHistoryQuery => {
    const base: AttendanceHistoryQuery = {
      page,
      pageSize,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    };
    if (filterDate.trim()) {
      return { ...base, date: filterDate.trim() };
    }
    if (filterFrom.trim() && filterTo.trim()) {
      return { ...base, from: filterFrom.trim(), to: filterTo.trim() };
    }
    if (filterFrom.trim()) {
      return { ...base, from: filterFrom.trim(), to: filterFrom.trim() };
    }
    if (filterTo.trim()) {
      return { ...base, from: filterTo.trim(), to: filterTo.trim() };
    }
    const to = orgTodayKey;
    const from = addDaysToDateKey(orgTodayKey, -HISTORY_LOOKBACK_DAYS);
    return { ...base, from, to };
  }, [filterDate, filterFrom, filterTo, orgTodayKey, page, pageSize, statusFilter]);

  const loadToday = useCallback(async (signal?: AbortSignal, opts?: { silent?: boolean }) => {
    setTodayError(null);
    if (!opts?.silent) setTodayLoading(true);
    try {
      const response = await retryAfterAccessRefresh(
        () => fetchMyTodayAttendance(signal),
        refreshPermissions,
      );
      if (signal?.aborted) return;
      serverSkewMs.current = Date.parse(response.serverTime) - Date.now();
      setToday(response);
    } catch (failure) {
      if (signal?.aborted || isAbortError(failure)) return;
      setTodayError(describeError(failure));
    } finally {
      if (!signal?.aborted) setTodayLoading(false);
    }
  }, [refreshPermissions]);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const response = await retryAfterAccessRefresh(
        () => fetchMyAttendanceHistory(historyQuery, signal),
        refreshPermissions,
      );
      if (signal?.aborted) return;
      setHistory(response);
    } catch (failure) {
      if (signal?.aborted || isAbortError(failure)) return;
      setHistoryError(describeError(failure));
    } finally {
      if (!signal?.aborted) setHistoryLoading(false);
    }
  }, [historyQuery, refreshPermissions]);

  useEffect(() => {
    const controller = new AbortController();
    void loadToday(controller.signal);
    return () => controller.abort();
  }, [loadToday]);

  useEffect(() => {
    if (!today) return;
    if (!historyDefaultsSet.current) {
      historyDefaultsSet.current = true;
      setFilterFrom(addDaysToDateKey(orgTodayKey, -HISTORY_LOOKBACK_DAYS));
      setFilterTo(orgTodayKey);
    }
  }, [orgTodayKey, today]);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [loadHistory]);

  useEffect(() => {
    const record = today?.record;
    if (!record?.punchInAt || record.punchOutAt) return;
    const timer = window.setInterval(() => {
      setClockMs(Date.now() + serverSkewMs.current);
    }, 1_000);
    setClockMs(Date.now() + serverSkewMs.current);
    return () => window.clearInterval(timer);
  }, [today?.record]);

  const ensureDevice = async () => {
    if (!deviceKey) return;
    try {
      await registerAttendanceDevice({ deviceKey, label: 'This desktop' });
    } catch {
      // already registered
    }
  };

  const onPunchIn = async () => {
    setPunchAction('in');
    try {
      await ensureDevice();
      await punchIn({ deviceKey, idempotencyKey: crypto.randomUUID() });
      toast.success('Punched in successfully');
      await loadToday(undefined, { silent: true });
      setClockMs(Date.now() + serverSkewMs.current);
    } catch (failure) {
      toast.error(describeError(failure));
      await loadToday(undefined, { silent: true });
    } finally {
      setPunchAction(null);
    }
  };

  const onPunchOut = async () => {
    setPunchAction('out');
    try {
      await punchOut({ deviceKey, idempotencyKey: crypto.randomUUID() });
      toast.success('Punched out successfully');
      await loadToday(undefined, { silent: true });
      await loadHistory();
    } catch (failure) {
      toast.error(describeError(failure));
      await loadToday(undefined, { silent: true });
    } finally {
      setPunchAction(null);
    }
  };

  const clearFilters = useCallback(() => {
    setFilterDate('');
    setFilterFrom(addDaysToDateKey(orgTodayKey, -HISTORY_LOOKBACK_DAYS));
    setFilterTo(orgTodayKey);
    setStatusFilter('ALL');
    setPage(1);
  }, [orgTodayKey]);

  const filtersActive =
    filterDate.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    filterFrom !== addDaysToDateKey(orgTodayKey, -HISTORY_LOOKBACK_DAYS) ||
    filterTo !== orgTodayKey;

  const setFilterDateAndReset = (value: string) => {
    setFilterDate(value);
    setPage(1);
  };

  const setFilterFromAndReset = (value: string) => {
    setFilterDate('');
    setFilterFrom(value);
    setPage(1);
  };

  const setFilterToAndReset = (value: string) => {
    setFilterDate('');
    setFilterTo(value);
    setPage(1);
  };

  const setStatusFilterAndReset = (value: AttendanceStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((history?.total ?? 0) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    today,
    todayLoading,
    todayError,
    history,
    historyLoading,
    historyError,
    punchAction,
    clockMs,
    timeZone,
    orgTodayKey,
    filterDate,
    filterFrom,
    filterTo,
    statusFilter,
    page: safePage,
    pageSize,
    totalPages,
    filtersActive,
    setFilterDate: setFilterDateAndReset,
    setFilterFrom: setFilterFromAndReset,
    setFilterTo: setFilterToAndReset,
    setStatusFilter: setStatusFilterAndReset,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    clearFilters,
    onPunchIn,
    onPunchOut,
    reloadToday: () => void loadToday(),
    reloadHistory: () => void loadHistory(),
  };
}
