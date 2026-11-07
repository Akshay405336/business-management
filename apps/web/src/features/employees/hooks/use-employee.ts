'use client';

import { useCallback, useEffect, useState } from 'react';
import { getEmployee } from '../api/employee.api';
import type { EmployeeDetail } from '../types';
import { describeEmployeeError } from '../utils/errors';

export function useEmployee(employeeId: string | null, enabled: boolean) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setEmployee(await getEmployee(employeeId));
    } catch (failure) {
      setEmployee(null);
      setError(describeEmployeeError(failure));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!enabled || !employeeId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);
    void getEmployee(employeeId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setEmployee(result);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setEmployee(null);
        setError(describeEmployeeError(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, employeeId]);

  return { employee, loading, error, refetch };
}
