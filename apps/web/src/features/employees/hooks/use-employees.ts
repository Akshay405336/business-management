'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listEmployees } from '../api/employee.api';
import { employeeQueryKeys } from '../api/employee.query-keys';
import type { EmployeeListItem, EmployeeListQuery } from '../types';
import { describeEmployeeError } from '../utils/errors';

export function useEmployees(query: EmployeeListQuery) {
  const [items, setItems] = useState<readonly EmployeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const queryKey = JSON.stringify(employeeQueryKeys.list(query));

  const refetch = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await listEmployees(query);
      if (id !== requestId.current) return;
      setItems(response.items);
      setTotal(response.total);
    } catch (failure) {
      if (id !== requestId.current) return;
      setError(describeEmployeeError(failure));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void queryKey;
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    void listEmployees(query)
      .then((response) => {
        if (id !== requestId.current) return;
        setItems(response.items);
        setTotal(response.total);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (id !== requestId.current) return;
        setError(describeEmployeeError(failure));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [query, queryKey]);

  return { items, total, loading, error, refetch };
}
