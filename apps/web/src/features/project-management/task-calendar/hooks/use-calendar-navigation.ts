'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { monthKeyFromDate } from '../utils/calendar-date.utils';

function parseMonthFromParams(search: ReturnType<typeof useSearchParams>): string {
  const m = search.get('month');
  if (m && /^\d{4}-\d{2}$/.test(m)) return m;
  return monthKeyFromDate(new Date());
}

export function useCalendarNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthKey = useMemo(() => parseMonthFromParams(searchParams), [searchParams]);

  useEffect(() => {
    if (searchParams.get('month')) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', monthKeyFromDate(new Date()));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setMonthKey = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('month', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const goToToday = useCallback(() => {
    setMonthKey(monthKeyFromDate(new Date()));
  }, [setMonthKey]);

  return { monthKey, setMonthKey, goToToday };
}
