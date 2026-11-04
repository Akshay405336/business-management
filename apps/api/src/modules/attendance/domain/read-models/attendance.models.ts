import type { OrgCalendarDayKind } from '@techwin/contracts';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';
import type { AttendanceStatus } from '../enums/attendance-status.enum.js';

export type AttendanceScheduleSnapshot = Omit<AttendanceScheduleConfig, 'ipAllowlist'>;

export type AttendanceScheduleSettings = {
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
  readonly daySchedules: readonly { day: number; startMinutes: number; endMinutes: number }[];
  readonly earlyPunchInAllowanceMinutes: number;
  readonly requireRegisteredDevice: boolean;
  readonly ipAllowlist: readonly string[];
  readonly allowPunchOutAfterOfficeEnd: boolean;
  readonly createdAt: string;
};

export type AttendanceSettingsResponse = {
  readonly current: AttendanceScheduleSettings | null;
  readonly history: readonly AttendanceScheduleSettings[];
};

export type AttendanceRecordItem = {
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
};

export type AttendanceCorrectionItem = {
  readonly id: string;
  readonly adminId: string;
  readonly reason: string;
  readonly previousValues: Record<string, unknown>;
  readonly newValues: Record<string, unknown>;
  readonly createdAt: string;
};

export type AttendanceRecordDetail = AttendanceRecordItem & {
  readonly punchInUserAgent: string | null;
  readonly punchInIp: string | null;
  readonly punchOutUserAgent: string | null;
  readonly punchOutIp: string | null;
  readonly corrections: readonly AttendanceCorrectionItem[];
};

export type AttendanceListResponse = {
  readonly items: readonly AttendanceRecordItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
};

export type AttendanceCalendarDaySummary = {
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
  readonly organizationDayKind: OrgCalendarDayKind;
  readonly organizationDayLabel: string;
};

export type AttendanceCalendarResponse = {
  readonly from: string;
  readonly to: string;
  readonly days: readonly AttendanceCalendarDaySummary[];
};

export type AttendanceMyTodayResponse = {
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
};

export type AttendanceSummaryResponse = {
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
};

export type AttendanceDeviceItem = {
  readonly id: string;
  readonly label: string;
  readonly userAgentHint: string;
  readonly status: 'ACTIVE' | 'REVOKED';
  readonly registeredAt: string;
  readonly revokedAt: string | null;
  readonly lastUsedAt: string | null;
};
