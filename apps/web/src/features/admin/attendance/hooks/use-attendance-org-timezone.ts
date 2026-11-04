'use client';

import { useEffect, useState } from 'react';
import { fetchAttendanceSettings } from '@/features/attendance/api/attendance';

export function useAttendanceOrgTimeZone(): string {
  const [timeZone, setTimeZone] = useState('UTC');

  useEffect(() => {
    let cancelled = false;
    void fetchAttendanceSettings().then((settings) => {
      if (cancelled) return;
      setTimeZone(settings.current?.timeZone?.trim() || 'UTC');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return timeZone;
}
