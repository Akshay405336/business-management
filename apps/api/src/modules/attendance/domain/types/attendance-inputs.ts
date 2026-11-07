import type { AttendanceStatus } from '../enums/attendance-status.enum.js';

export type UpsertAttendanceSettingsInput = {
  readonly effectiveFrom: string;
  readonly timeZone: string;
  readonly officeStartMinutes: number;
  readonly officeEndMinutes: number;
  readonly lateGraceMinutes: number;
  readonly minFullDayMinutes: number;
  readonly minHalfDayMinutes: number;
  readonly weeklyOffDays: readonly number[];
  readonly workingDays: readonly number[];
  readonly daySchedules: readonly { day: number; startMinutes: number; endMinutes: number }[];
  readonly earlyPunchInAllowanceMinutes: number;
  readonly requireRegisteredDevice: boolean;
  readonly ipAllowlist: readonly string[];
  readonly allowPunchOutAfterOfficeEnd: boolean;
};

export type AttendanceListQuery = {
  readonly page: number;
  readonly pageSize: number;
  readonly date?: string;
  readonly from?: string;
  readonly to?: string;
  readonly employeeId?: string;
  readonly department?: string;
  readonly status?: AttendanceStatus;
  readonly lateOnly?: boolean;
  readonly absentOnly?: boolean;
  readonly search?: string;
};

export type AttendanceHistoryQuery = {
  readonly from?: string;
  readonly to?: string;
  readonly date?: string;
  readonly status?: AttendanceStatus;
  readonly page: number;
  readonly pageSize: number;
};

export type AttendanceSummaryQuery = {
  readonly from: string;
  readonly to: string;
};

export type CorrectAttendanceRecordInput = {
  readonly reason: string;
  readonly punchInAt?: string | null;
  readonly punchOutAt?: string | null;
  readonly status?: AttendanceStatus;
};

export type CreateAttendanceRecordInput = {
  readonly employeeId: string;
  readonly attendanceDate: string;
  readonly reason: string;
  readonly punchInAt?: string | null;
  readonly punchOutAt?: string | null;
  readonly status?: AttendanceStatus;
};

export type AttendanceCalendarQuery = {
  readonly from: string;
  readonly to: string;
  readonly search?: string;
  readonly status?: AttendanceStatus;
};

export type RegisterAttendanceDeviceInput = {
  readonly deviceKey: string;
  readonly label: string;
};
