'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useAttendanceRecordsList,
  type AttendanceRecordsListState,
} from '../hooks/use-attendance-records-list';

const AttendanceRecordsContext = createContext<AttendanceRecordsListState | null>(null);

export function AttendanceRecordsProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const value = useAttendanceRecordsList(active);
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
