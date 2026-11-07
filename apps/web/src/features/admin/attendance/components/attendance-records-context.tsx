'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useAttendanceRecordsList,
  type AttendanceRecordsListState,
  type AttendanceRecordsScope,
} from '../hooks/use-attendance-records-list';

const AttendanceRecordsContext = createContext<AttendanceRecordsListState | null>(null);

export function AttendanceRecordsProvider({
  active,
  scope = 'organization',
  children,
}: {
  active: boolean;
  scope?: AttendanceRecordsScope;
  children: ReactNode;
}) {
  const value = useAttendanceRecordsList(active, scope);
  return (
    <AttendanceRecordsContext.Provider value={value}>{children}</AttendanceRecordsContext.Provider>
  );
}

export function useAttendanceRecordsContext(): AttendanceRecordsListState {
  const ctx = useContext(AttendanceRecordsContext);
  if (!ctx) {
    throw new Error('useAttendanceRecordsContext must be used within AttendanceRecordsProvider');
  }
  return ctx;
}
