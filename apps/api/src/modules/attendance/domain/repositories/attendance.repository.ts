import type {
  AttendanceDeviceItem,
  AttendanceListResponse,
  AttendanceMyTodayResponse,
  AttendanceRecordDetail,
  AttendanceRecordItem,
  AttendanceCalendarResponse,
  AttendanceSettingsResponse,
  AttendanceSummaryResponse,
} from '../read-models/attendance.models.js';
import type { AttendanceScheduleConfig } from '../types/attendance-schedule.types.js';
import type {
  AttendanceCalendarQuery,
  AttendanceHistoryQuery,
  AttendanceListQuery,
  AttendanceSummaryQuery,
  CorrectAttendanceRecordInput,
  CreateAttendanceRecordInput,
  RegisterAttendanceDeviceInput,
  UpsertAttendanceSettingsInput,
} from '../types/attendance-inputs.js';

export const ATTENDANCE_REPOSITORY = Symbol('ATTENDANCE_REPOSITORY');

export type PunchContext = {
  readonly organizationId: string;
  readonly employeeId: string;
  readonly adminId: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly deviceKey?: string;
  readonly idempotencyKey?: string;
  readonly now: Date;
};

export type AttendanceRepository = {
  resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null>;
  getSettings(organizationId: string): Promise<AttendanceSettingsResponse>;
  upsertSettings(
    organizationId: string,
    adminId: string,
    input: UpsertAttendanceSettingsInput,
  ): Promise<AttendanceSettingsResponse>;
  resolveScheduleForDate(
    organizationId: string,
    attendanceDate: string,
  ): Promise<AttendanceScheduleConfig | null>;
  getMyToday(
    organizationId: string,
    employeeId: string,
    now: Date,
    desktopSession: boolean,
  ): Promise<AttendanceMyTodayResponse>;
  punchIn(ctx: PunchContext): Promise<AttendanceRecordItem>;
  punchOut(ctx: PunchContext): Promise<AttendanceRecordItem>;
  listRecords(organizationId: string, query: AttendanceListQuery): Promise<AttendanceListResponse>;
  getCalendarSummary(
    organizationId: string,
    query: AttendanceCalendarQuery,
  ): Promise<AttendanceCalendarResponse>;
  createManualRecord(
    organizationId: string,
    adminId: string,
    input: CreateAttendanceRecordInput,
  ): Promise<AttendanceRecordDetail>;
  getRecordDetail(organizationId: string, recordId: string): Promise<AttendanceRecordDetail>;
  listMyHistory(
    organizationId: string,
    employeeId: string,
    query: AttendanceHistoryQuery,
  ): Promise<AttendanceListResponse>;
  getMySummary(
    organizationId: string,
    employeeId: string,
    query: AttendanceSummaryQuery,
  ): Promise<AttendanceSummaryResponse>;
  correctRecord(
    organizationId: string,
    adminId: string,
    recordId: string,
    input: CorrectAttendanceRecordInput,
  ): Promise<AttendanceRecordDetail>;
  listDevices(organizationId: string, employeeId: string): Promise<readonly AttendanceDeviceItem[]>;
  registerDevice(
    organizationId: string,
    employeeId: string,
    adminId: string,
    userAgent: string | null,
    input: RegisterAttendanceDeviceInput,
  ): Promise<AttendanceDeviceItem>;
  revokeDevice(organizationId: string, employeeId: string, deviceId: string): Promise<void>;
  processAbsentForOrganization(organizationId: string, now: Date): Promise<number>;
  processIncompleteForOrganization(organizationId: string, now: Date): Promise<number>;
  listOrganizationIdsWithSchedules(): Promise<readonly string[]>;
};
