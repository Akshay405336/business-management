'use client';

import type { LeaveYearConfigurationItem } from '@techwin/contracts';
import { useCallback, useEffect, useState } from 'react';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { listLeaveYearConfigurations } from '@/features/leave/api/leave-api';
import { subscribeLeaveDataChanged } from '@/features/leave/lib/leave-data-sync';
import { isAbortError } from '@/shared/lib/abort-error';

export function useActiveLeaveBalances() {
  const [configurations, setConfigurations] = useState<readonly LeaveYearConfigurationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const rows = await listLeaveYearConfigurations(signal);
      setConfigurations(rows.filter((row) => row.status === 'ACTIVE'));
      setError(null);
    } catch (failure) {
      if (isAbortError(failure)) return;
      setError(describeCrmError(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);
    const unsubscribe = subscribeLeaveDataChanged(() => {
      void refetch();
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [refetch]);

  return { configurations, loading, error, refetch };
}
