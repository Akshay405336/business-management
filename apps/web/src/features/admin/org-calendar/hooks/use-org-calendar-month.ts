'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrgCalendarMonthResponse } from '@techwin/contracts';
import { isAbortError } from '@/shared/lib/abort-error';
import { fetchOrgCalendarMonth } from '../api/org-calendar-api';
import { subscribeOrgCalendarSync } from '../lib/org-calendar-sync';

export function useOrgCalendarMonth(params: {
  year: number;
  month: number;
  eventTypes?: string;
  search?: string;
  enabled?: boolean;
}) {
  const [data, setData] = useState<OrgCalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    if (params.enabled === false) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOrgCalendarMonth(
        {
          year: params.year,
          month: params.month,
          eventTypes: params.eventTypes,
          search: params.search || undefined,
        },
        controller.signal,
      );
      setData(response);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to load calendar.');
      setData(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [params.year, params.month, params.eventTypes, params.search, params.enabled]);

  useEffect(() => {
    void reload();
    return () => abortRef.current?.abort();
  }, [reload]);

  useEffect(() => {
    return subscribeOrgCalendarSync(() => {
      void reload();
    });
  }, [reload]);

  return { data, loading, error, reload };
}
