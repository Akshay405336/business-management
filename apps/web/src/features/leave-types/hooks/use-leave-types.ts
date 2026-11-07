'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaveTypeItem } from '@techwin/contracts';
import { describeCrmError } from '@/features/admin/crm/utils/errors';
import { isAbortError } from '@/shared/lib/abort-error';
import { listLeaveTypes, type LeaveTypeListQuery } from '../api/leave-type.api';

export type UseLeaveTypesOptions = {
  readonly query: LeaveTypeListQuery;
  readonly enabled?: boolean;
};

export function useLeaveTypes({ query, enabled = true }: UseLeaveTypesOptions) {
  const [items, setItems] = useState<readonly LeaveTypeItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const refetch = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled) return;
      setLoading(true);
      try {
        const parsed = JSON.parse(queryKey) as LeaveTypeListQuery;
        const result = await listLeaveTypes(parsed, signal);
        setItems(result.items);
        setError(null);
      } catch (failure) {
        if (isAbortError(failure)) return;
        setError(describeCrmError(failure));
      } finally {
        setLoading(false);
      }
    },
    [enabled, queryKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return {
    leaveTypes: items,
    loading,
    error,
    refetch: () => void refetch(),
  };
}
