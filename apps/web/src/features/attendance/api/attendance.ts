import { ATTENDANCE_ROUTES } from '@techwin/contracts';
import type {
  AttendanceCalendarResponse,
  AttendanceDeviceItem,
  AttendanceListResponse,
  AttendanceMyTodayResponse,
  AttendanceRecordDetail,
  AttendanceRecordItem,
  AttendanceSettingsResponse,
  AttendanceSummaryResponse,
} from '@techwin/contracts';
import type {
  AttendanceCalendarQuery,
  AttendanceHistoryQuery,
  AttendanceListQuery,
  AttendanceSummaryQuery,
  CorrectAttendanceRecordRequest,
  CreateAttendanceRecordRequest,
  PunchAttendanceRequest,
  RegisterAttendanceDeviceRequest,
  UpsertAttendanceSettingsRequest,
} from '@techwin/validation';
import { apiRequest } from '@/shared/api/api-client';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';

export function fetchMyTodayAttendance(signal?: AbortSignal): Promise<AttendanceMyTodayResponse> {
  return apiRequest<AttendanceMyTodayResponse>(ATTENDANCE_ROUTES.myToday, { auth: true, signal });
}

export function fetchMyAttendanceHistory(
  query: AttendanceHistoryQuery,
  signal?: AbortSignal,
): Promise<readonly AttendanceRecordItem[]> {
  return apiRequest<readonly AttendanceRecordItem[]>(
    `${ATTENDANCE_ROUTES.myHistory}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchMyAttendanceSummary(
  query: AttendanceSummaryQuery,
  signal?: AbortSignal,
): Promise<AttendanceSummaryResponse> {
  return apiRequest<AttendanceSummaryResponse>(
    `${ATTENDANCE_ROUTES.mySummary}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function punchIn(
  body: PunchAttendanceRequest,
  signal?: AbortSignal,
): Promise<AttendanceRecordItem> {
  return apiRequest<AttendanceRecordItem>(ATTENDANCE_ROUTES.punchIn, {
    auth: true,
    method: 'POST',
    body,
    signal,
  });
}

export function punchOut(
  body: PunchAttendanceRequest,
  signal?: AbortSignal,
): Promise<AttendanceRecordItem> {
  return apiRequest<AttendanceRecordItem>(ATTENDANCE_ROUTES.punchOut, {
    auth: true,
    method: 'POST',
    body,
    signal,
  });
}

export function fetchAttendanceSettings(signal?: AbortSignal): Promise<AttendanceSettingsResponse> {
  return apiRequest<AttendanceSettingsResponse>(ATTENDANCE_ROUTES.settings, { auth: true, signal });
}

export function saveAttendanceSettings(
  body: UpsertAttendanceSettingsRequest,
  signal?: AbortSignal,
): Promise<AttendanceSettingsResponse> {
  return apiRequest<AttendanceSettingsResponse>(ATTENDANCE_ROUTES.settings, {
    auth: true,
    method: 'PATCH',
    body,
    signal,
  });
}

export function listAttendanceRecords(
  query: Partial<AttendanceListQuery>,
  signal?: AbortSignal,
): Promise<AttendanceListResponse> {
  return apiRequest<AttendanceListResponse>(
    `${ATTENDANCE_ROUTES.records}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function fetchAttendanceCalendar(
  query: AttendanceCalendarQuery,
  signal?: AbortSignal,
): Promise<AttendanceCalendarResponse> {
  return apiRequest<AttendanceCalendarResponse>(
    `${ATTENDANCE_ROUTES.calendar}${buildQueryString(query)}`,
    { auth: true, signal },
  );
}

export function createAttendanceRecord(
  body: CreateAttendanceRecordRequest,
  signal?: AbortSignal,
): Promise<AttendanceRecordDetail> {
  return apiRequest<AttendanceRecordDetail>(ATTENDANCE_ROUTES.records, {
    auth: true,
    method: 'POST',
    body,
    signal,
  });
}

export function fetchAttendanceRecordDetail(
  id: string,
  signal?: AbortSignal,
): Promise<AttendanceRecordDetail> {
  return apiRequest<AttendanceRecordDetail>(ATTENDANCE_ROUTES.record(id), { auth: true, signal });
}

export function correctAttendanceRecord(
  id: string,
  body: CorrectAttendanceRecordRequest,
  signal?: AbortSignal,
): Promise<AttendanceRecordDetail> {
  return apiRequest<AttendanceRecordDetail>(ATTENDANCE_ROUTES.correctRecord(id), {
    auth: true,
    method: 'POST',
    body,
    signal,
  });
}

export function listAttendanceDevices(signal?: AbortSignal): Promise<readonly AttendanceDeviceItem[]> {
  return apiRequest<readonly AttendanceDeviceItem[]>(ATTENDANCE_ROUTES.devices, {
    auth: true,
    signal,
  });
}

export function registerAttendanceDevice(
  body: RegisterAttendanceDeviceRequest,
  signal?: AbortSignal,
): Promise<AttendanceDeviceItem> {
  return apiRequest<AttendanceDeviceItem>(ATTENDANCE_ROUTES.devices, {
    auth: true,
    method: 'POST',
    body,
    signal,
  });
}

export function revokeAttendanceDevice(id: string, signal?: AbortSignal): Promise<void> {
  return apiRequest<void>(ATTENDANCE_ROUTES.device(id), { auth: true, method: 'DELETE', signal });
}
