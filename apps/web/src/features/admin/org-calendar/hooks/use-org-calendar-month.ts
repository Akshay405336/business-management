'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrgCalendarMonthResponse } from '@techwin/contracts';
import { isAbortError } from '@/shared/lib/abort-error';
import { fetchEmployeeOrgCalendarMonth, fetchOrgCalendarMonth } from '../api/org-calendar-api';
import { subscribeOrgCalendarSync } from '../lib/org-calendar-sync';

export type OrgCalendarMonthScope = 'organization' | 'member';

export function useOrgCalendarMonth(params: {
  year: number;
  month: number;
  eventTypes?: string;
  search?: string;
  enabled?: boolean;
  /** Member scope uses the employee calendar API (read-only organisation view). */
  scope?: OrgCalendarMonthScope;
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
      const query = {
        year: params.year,
        month: params.month,
        eventTypes: params.eventTypes,
        search: params.search || undefined,
      };
      const response =
        params.scope === 'member'
          ? await fetchEmployeeOrgCalendarMonth(query, controller.signal)
          : await fetchOrgCalendarMonth(query, controller.signal);
      setData(response);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err instanceof Error ? err.message : 'Failed to load calendar.');
      setData(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [params.year, params.month, params.eventTypes, params.search, params.enabled, params.scope]);

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
