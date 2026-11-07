'use client';

import { useCallback, useEffect, useState } from 'react';
import { listAssignableEmployees } from '../api/employee.api';
import type { AssignableEmployee } from '@techwin/contracts';
import { describeEmployeeError } from '../utils/errors';

export function useEmployeeOptions(search = '', enabled = true) {
  const [items, setItems] = useState<readonly AssignableEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listAssignableEmployees(search);
      setItems(response.items);
    } catch (failure) {
      setError(describeEmployeeError(failure));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    void listAssignableEmployees(search, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setItems(response.items);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(describeEmployeeError(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, search]);

  return { items, loading, error, refetch };
}
