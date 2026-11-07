'use client';

import type { EmployeeLeaveRecordsResponse } from '@techwin/contracts';
import type { EmployeeLeaveRecordsListQuery } from '@techwin/validation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { listEmployeeLeaveRecords } from '@/features/leave/api/leave-api';
import { subscribeLeaveDataChanged } from '@/features/leave/lib/leave-data-sync';
import { isAbortError } from '@/shared/lib/abort-error';

export function useEmployeeLeaveRecords(
  configurationId: string | null,
  query: EmployeeLeaveRecordsListQuery,
) {
  const [data, setData] = useState<EmployeeLeaveRecordsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!configurationId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const response = await listEmployeeLeaveRecords(configurationId, query);
      if (requestId !== requestIdRef.current) return;
      setData(response);
      setError(null);
    } catch (failure) {
      if (isAbortError(failure)) return;
      if (requestId !== requestIdRef.current) return;
      setError(describeCrmError(failure));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [configurationId, query]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const unsubscribe = subscribeLeaveDataChanged(() => {
      void refetch();
    });
    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}
