'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaveYearConfigurationItem } from '@techwin/contracts';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { isAbortError } from '@/shared/lib/abort-error';
import { subscribeLeaveDataChanged } from '@/features/leave/lib/leave-data-sync';
import { listLeaveYearConfigurations } from '../api/leave-balances.api';

export function useLeaveBalances() {
  const [items, setItems] = useState<readonly LeaveYearConfigurationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const rows = await listLeaveYearConfigurations(signal);
      setItems(rows);
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

  return { leaveBalances: items, loading, error, refetch: () => void refetch() };
}
