import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import type {
  AttendanceDeviceItem,
  AttendanceRecordDetail,
  AttendanceRecordItem,
  AttendanceScheduleSettings,
  AttendanceScheduleSnapshot,
} from '../../../../domain/read-models/attendance.models.js';
import type { AttendanceStatus } from '../../../../domain/enums/attendance-status.enum.js';
import type {
  AttendanceCorrection,
  AttendanceDevice,
  AttendanceRecord,
  AttendanceSchedule,
  Employee,
} from '../../../../../../generated/prisma/client.js';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { evaluateAttendance } from '../../../../domain/policies/attendance-status.policy.js';
import type {
  AttendanceDaySchedule,
  AttendanceScheduleConfig,
} from '../../../../domain/types/attendance-schedule.types.js';
import {
  calendarDateKey,
  normalizeDaySchedules,
  resolveOfficeHoursForWeekday,
  getZonedParts,
} from '../../../../domain/services/attendance-time.service.js';

export function toScheduleConfig(row: AttendanceSchedule): AttendanceScheduleConfig {
  const workingDays = parseNumberArray(row.workingDays);
  const parsedDaySchedules = parseDaySchedules(row.daySchedules);
  const daySchedules = normalizeDaySchedules(
    workingDays,
    row.officeStartMinutes,
    row.officeEndMinutes,
    parsedDaySchedules,
  );
  return {
    scheduleId: row.id,
    timeZone: row.timeZone,
    officeStartMinutes: row.officeStartMinutes,
    officeEndMinutes: row.officeEndMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    minFullDayMinutes: row.minFullDayMinutes,
    minHalfDayMinutes: row.minHalfDayMinutes,
    weeklyOffDays: parseNumberArray(row.weeklyOffDays),
    workingDays,
    daySchedules,
    earlyPunchInAllowanceMinutes: row.earlyPunchInAllowanceMinutes,
    requireRegisteredDevice: row.requireRegisteredDevice,
    allowPunchOutAfterOfficeEnd: row.allowPunchOutAfterOfficeEnd,
    ipAllowlist: parseStringArray(row.ipAllowlist),
  };
}

export function toScheduleSnapshot(config: AttendanceScheduleConfig): AttendanceScheduleSnapshot {
  return {
    scheduleId: config.scheduleId,
    timeZone: config.timeZone,
    officeStartMinutes: config.officeStartMinutes,
    officeEndMinutes: config.officeEndMinutes,
    lateGraceMinutes: config.lateGraceMinutes,
    minFullDayMinutes: config.minFullDayMinutes,
    minHalfDayMinutes: config.minHalfDayMinutes,
    weeklyOffDays: [...config.weeklyOffDays],
    workingDays: [...config.workingDays],
    daySchedules: [...config.daySchedules],
    earlyPunchInAllowanceMinutes: config.earlyPunchInAllowanceMinutes,
    requireRegisteredDevice: config.requireRegisteredDevice,
    allowPunchOutAfterOfficeEnd: config.allowPunchOutAfterOfficeEnd,
  };
}

export function toScheduleSettings(row: AttendanceSchedule): AttendanceScheduleSettings {
  return {
    id: row.id,
    effectiveFrom: calendarDateKey(row.effectiveFrom),
    timeZone: row.timeZone,
    officeStartMinutes: row.officeStartMinutes,
    officeEndMinutes: row.officeEndMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    minFullDayMinutes: row.minFullDayMinutes,
    minHalfDayMinutes: row.minHalfDayMinutes,
    weeklyOffDays: parseNumberArray(row.weeklyOffDays),
    workingDays: parseNumberArray(row.workingDays),
    daySchedules: normalizeDaySchedules(
      parseNumberArray(row.workingDays),
      row.officeStartMinutes,
      row.officeEndMinutes,
      parseDaySchedules(row.daySchedules),
    ),
    earlyPunchInAllowanceMinutes: row.earlyPunchInAllowanceMinutes,
    requireRegisteredDevice: row.requireRegisteredDevice,
    ipAllowlist: parseStringArray(row.ipAllowlist),
    allowPunchOutAfterOfficeEnd: row.allowPunchOutAfterOfficeEnd,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseDaySchedules(value: Prisma.JsonValue | null): AttendanceDaySchedule[] {
  if (!value || !Array.isArray(value)) return [];
  const out: AttendanceDaySchedule[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const day = (item as { day?: unknown }).day;
    const startMinutes = (item as { startMinutes?: unknown }).startMinutes;
    const endMinutes = (item as { endMinutes?: unknown }).endMinutes;
    if (
      typeof day === 'number' &&
      typeof startMinutes === 'number' &&
      typeof endMinutes === 'number'
    ) {
      out.push({ day, startMinutes, endMinutes });
    }
  }
  return out;
}

export function snapshotFromJson(value: Prisma.JsonValue): AttendanceScheduleSnapshot {
  const raw = (value ?? {}) as Partial<AttendanceScheduleSnapshot> & {
    attendanceCutoffMinutes?: number;
  };
  return {
    scheduleId: raw.scheduleId ?? '',
    timeZone: raw.timeZone ?? 'UTC',
    officeStartMinutes: raw.officeStartMinutes ?? 0,
    officeEndMinutes: raw.officeEndMinutes ?? 0,
    lateGraceMinutes: raw.lateGraceMinutes ?? 0,
    minFullDayMinutes: raw.minFullDayMinutes ?? 0,
    minHalfDayMinutes: raw.minHalfDayMinutes ?? 0,
    weeklyOffDays: raw.weeklyOffDays ?? [],
    workingDays: raw.workingDays ?? [],
    daySchedules: raw.daySchedules ?? [],
    earlyPunchInAllowanceMinutes: raw.earlyPunchInAllowanceMinutes ?? 0,
    requireRegisteredDevice: raw.requireRegisteredDevice ?? false,
    allowPunchOutAfterOfficeEnd: raw.allowPunchOutAfterOfficeEnd ?? true,
  };
}

export function snapshotToScheduleConfig(snapshot: AttendanceScheduleSnapshot): AttendanceScheduleConfig {
  return {
    scheduleId: snapshot.scheduleId,
    timeZone: snapshot.timeZone,
    officeStartMinutes: snapshot.officeStartMinutes,
    officeEndMinutes: snapshot.officeEndMinutes,
    lateGraceMinutes: snapshot.lateGraceMinutes,
    minFullDayMinutes: snapshot.minFullDayMinutes,
    minHalfDayMinutes: snapshot.minHalfDayMinutes,
    weeklyOffDays: snapshot.weeklyOffDays ?? [],
    workingDays: snapshot.workingDays ?? [],
    daySchedules: snapshot.daySchedules ?? [],
    earlyPunchInAllowanceMinutes: snapshot.earlyPunchInAllowanceMinutes ?? 0,
    requireRegisteredDevice: snapshot.requireRegisteredDevice ?? false,
    allowPunchOutAfterOfficeEnd: snapshot.allowPunchOutAfterOfficeEnd ?? true,
    ipAllowlist: [],
  };
}

export function snapshotToJson(snapshot: AttendanceScheduleSnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
}

function employeeProfileImageUrl(employee: Employee): string | null {
  return employee.profileImageStoredObjectId
    ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(employee.profileImageStoredObjectId)
    : employee.profileImageUrl;
}

export function toRecordItem(
  row: AttendanceRecord & { employee: Employee },
): AttendanceRecordItem {
  const snapshot = snapshotFromJson(row.scheduleSnapshot);
  const attendanceDate = calendarDateKey(row.attendanceDate);
  const timing = recordTiming(snapshot, attendanceDate, row.punchInAt, row.punchOutAt);
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeDisplayName: row.employee.displayName,
    employeeCode: row.employee.employeeCode,
    profileImageUrl: employeeProfileImageUrl(row.employee),
    attendanceDate,
    status: row.status satisfies AttendanceStatus,
    punchInAt: row.punchInAt?.toISOString() ?? null,
    punchOutAt: row.punchOutAt?.toISOString() ?? null,
    lateMinutes: row.lateMinutes,
    earlyMinutes: timing.earlyMinutes,
    leftEarlyMinutes: timing.leftEarlyMinutes,
    stayedLateMinutes: timing.stayedLateMinutes,
    workingMinutes: row.workingMinutes,
    scheduleSnapshot: snapshot,
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
  };
}

function recordTiming(
  snapshot: AttendanceScheduleSnapshot,
  attendanceDate: string,
  punchInAt: Date | null,
  punchOutAt: Date | null,
) {
  const schedule = snapshotToScheduleConfig(snapshot);
  const weekday = getZonedParts(new Date(`${attendanceDate}T12:00:00.000Z`), schedule.timeZone).weekday;
  const officeHours = resolveOfficeHoursForWeekday(schedule, weekday);
  return evaluateAttendance({
    schedule,
    attendanceDate,
    punchInAt,
    punchOutAt,
    officeStartMinutes: officeHours.startMinutes,
    officeEndMinutes: officeHours.endMinutes,
  });
}

export function toRecordDetail(
  row: AttendanceRecord & { employee: Employee; corrections: AttendanceCorrection[] },
): AttendanceRecordDetail {
  return {
    ...toRecordItem(row),
    punchInUserAgent: row.punchInUserAgent,
    punchInIp: row.punchInIp,
    punchOutUserAgent: row.punchOutUserAgent,
    punchOutIp: row.punchOutIp,
    corrections: row.corrections.map((c) => ({
      id: c.id,
      adminId: c.adminId,
      reason: c.reason,
      previousValues: c.previousValues as Record<string, unknown>,
      newValues: c.newValues as Record<string, unknown>,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export function toDeviceItem(row: AttendanceDevice): AttendanceDeviceItem {
  return {
    id: row.id,
    label: row.label,
    userAgentHint: row.userAgentHint,
    status: row.status,
    registeredAt: row.registeredAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

function parseNumberArray(value: Prisma.JsonValue): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}

function parseStringArray(value: Prisma.JsonValue | null): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}
