'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TaskCalendarFiltersResponse } from '@techwin/contracts';
import { fetchTaskCalendarFilters } from '../api/task-calendar.api';

/** Module cache: filter options rarely change — avoid refetch on every Task Calendar mount. */
let cachedFilters: TaskCalendarFiltersResponse | null = null;
let inFlightFilters: Promise<TaskCalendarFiltersResponse> | null = null;

export function useCalendarFilters() {
  const [data, setData] = useState<TaskCalendarFiltersResponse | null>(cachedFilters);
  const [loading, setLoading] = useState(!cachedFilters);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (cachedFilters) {
      setData(cachedFilters);
      setLoading(false);
      setError(false);
      return cachedFilters;
    }
    if (inFlightFilters) {
      setLoading(true);
      setError(false);
      try {
        const res = await inFlightFilters;
        if (!signal?.aborted) {
          setData(res);
          setLoading(false);
        }
        return res;
      } catch {
        if (!signal?.aborted) {
          setError(true);
          setLoading(false);
        }
        return null;
      }
    }

    setLoading(true);
    setError(false);
    const p = fetchTaskCalendarFilters(signal);
    inFlightFilters = p;
    try {
      const res = await p;
      cachedFilters = res;
      inFlightFilters = null;
      if (!signal?.aborted) {
        setData(res);
        setError(false);
      }
      return res;
    } catch {
      inFlightFilters = null;
      if (!signal?.aborted) {
        setError(true);
        setData(null);
      }
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cached options: state already initialized from module cache — avoid sync setState in effect.
    if (cachedFilters) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      void load(ac.signal);
    }, 0);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [load]);

  return {
    filters: data,
    /** Only true when no cached options yet (initial app visit / hard refresh). */
    loading,
    error,
    reload: load,
  };
}
