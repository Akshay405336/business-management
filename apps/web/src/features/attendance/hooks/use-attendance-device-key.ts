'use client';

import { useMemo } from 'react';

function createDeviceKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Session-scoped device identifier; re-register on each browser session when trusted devices are required. */
export function useAttendanceDeviceKey(): string {
  return useMemo(() => createDeviceKey(), []);
}
