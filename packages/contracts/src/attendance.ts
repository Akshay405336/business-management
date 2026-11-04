import { API_PREFIX } from './http.js';
import type { OrgCalendarDayKind } from './org-calendar.js';

export const ATTENDANCE_ROUTES = {
  settings: `${API_PREFIX}/attendance/settings`,
  punchIn: `${API_PREFIX}/attendance/punch-in`,
  punchOut: `${API_PREFIX}/attendance/punch-out`,
  myToday: `${API_PREFIX}/attendance/my/today`,
  myHistory: `${API_PREFIX}/attendance/my/history`,
  mySummary: `${API_PREFIX}/attendance/my/summary`,
  records: `${API_PREFIX}/attendance/records`,
  calendar: `${API_PREFIX}/attendance/calendar`,
  record: (id: string) => `${API_PREFIX}/attendance/records/${id}`,
  correctRecord: (id: string) => `${API_PREFIX}/attendance/records/${id}/corrections`,
  devices: `${API_PREFIX}/attendance/devices`,
  device: (id: string) => `${API_PREFIX}/attendance/devices/${id}`,
} as const;

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKLY_OFF'
  | 'PENDING';

export interface AttendanceDaySchedule {
  readonly day: number;
  readonly startMinutes: number;
  readonly endMinutes: number;
}

export interface AttendanceScheduleSnapshot {
  readonly scheduleId: string;
  readonly timeZone: string;
  readonly officeStartMinutes: number;
  readonly officeEndMinutes: number;
  readonly lateGraceMinutes: number;
  readonly attendanceCutoffMinutes: number;
  readonly minFullDayMinutes: number;
  readonly minHalfDayMinutes: number;
  readonly weeklyOffDays: readonly number[];
  readonly workingDays: readonly number[];
  readonly earlyPunchInAllowanceMinutes: number;
  readonly requireRegisteredDevice: boolean;
  readonly allowPunchOutAfterOfficeEnd: boolean;
  readonly daySchedules: readonly AttendanceDaySchedule[];
}

export interface AttendanceSettingsResponse {
  readonly current: AttendanceScheduleSettings | null;
  readonly history: readonly AttendanceScheduleSettings[];
}

export interface AttendanceScheduleSettings {
  readonly id: string;
  readonly effectiveFrom: string;
  readonly timeZone: string;
  readonly officeStartMinutes: number;
  readonly officeEndMinutes: number;
  readonly lateGraceMinutes: number;
  readonly attendanceCutoffMinutes: number;
  readonly minFullDayMinutes: number;
  readonly minHalfDayMinutes: number;
  readonly weeklyOffDays: readonly number[];
  readonly workingDays: readonly number[];
  readonly earlyPunchInAllowanceMinutes: number;
  readonly requireRegisteredDevice: boolean;
  readonly ipAllowlist: readonly string[];
  readonly allowPunchOutAfterOfficeEnd: boolean;
  readonly daySchedules: readonly AttendanceDaySchedule[];
  readonly createdAt: string;
}

export interface AttendanceRecordItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeDisplayName: string;
  readonly employeeCode: string;
  readonly attendanceDate: string;
  readonly status: AttendanceStatus;
  readonly punchInAt: string | null;
  readonly punchOutAt: string | null;
  readonly lateMinutes: number;
  readonly workingMinutes: number | null;
  readonly scheduleSnapshot: AttendanceScheduleSnapshot;
  readonly finalizedAt: string | null;
}

export interface AttendanceRecordDetail extends AttendanceRecordItem {
  readonly punchInUserAgent: string | null;
  readonly punchInIp: string | null;
  readonly punchOutUserAgent: string | null;
  readonly punchOutIp: string | null;
  readonly corrections: readonly AttendanceCorrectionItem[];
}

export interface AttendanceCorrectionItem {
  readonly id: string;
  readonly adminId: string;
  readonly reason: string;
  readonly previousValues: Record<string, unknown>;
  readonly newValues: Record<string, unknown>;
  readonly createdAt: string;
}

export interface AttendanceListResponse {
  readonly items: readonly AttendanceRecordItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface AttendanceCalendarDaySummary {
  readonly date: string;
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly halfDay: number;
  readonly holiday: number;
  readonly weeklyOff: number;
  readonly onLeave: number;
  readonly pending: number;
  readonly total: number;
  /** Authoritative organisation calendar classification for this date. */
  readonly organizationDayKind: OrgCalendarDayKind;
  readonly organizationDayLabel: string;
}

export interface AttendanceCalendarResponse {
  readonly from: string;
  readonly to: string;
  readonly days: readonly AttendanceCalendarDaySummary[];
}

export interface AttendanceMyTodayResponse {
  readonly attendanceDate: string;
  readonly serverTime: string;
  readonly schedule: AttendanceScheduleSnapshot | null;
  readonly dayKind: 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY';
  readonly record: AttendanceRecordItem | null;
  readonly canPunchIn: boolean;
  readonly canPunchOut: boolean;
  readonly punchBlockedReason: string | null;
  readonly isDesktopSession: boolean;
  readonly trustedDeviceRequired: boolean;
  readonly hasActiveTrustedDevice: boolean;
}

export interface AttendanceHistoryResponse {
  readonly items: readonly AttendanceRecordItem[];
}

export interface AttendanceSummaryResponse {
  readonly from: string;
  readonly to: string;
  readonly presentDays: number;
  readonly lateDays: number;
  readonly absentDays: number;
  readonly halfDays: number;
  readonly pendingDays: number;
  readonly weeklyOffDays: number;
  readonly holidayDays: number;
  readonly totalWorkingMinutes: number;
}

export interface AttendanceDeviceItem {
  readonly id: string;
  readonly label: string;
  readonly userAgentHint: string;
  readonly status: 'ACTIVE' | 'REVOKED';
  readonly registeredAt: string;
  readonly revokedAt: string | null;
  readonly lastUsedAt: string | null;
}

export interface AttendanceDevicesResponse {
  readonly items: readonly AttendanceDeviceItem[];
}
