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
import type {
  AttendanceDaySchedule,
  AttendanceScheduleConfig,
} from '../../../../domain/types/attendance-schedule.types.js';
import { normalizeDaySchedules } from '../../../../domain/services/attendance-time.service.js';

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
    attendanceCutoffMinutes: row.attendanceCutoffMinutes,
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
    attendanceCutoffMinutes: config.attendanceCutoffMinutes,
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
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    timeZone: row.timeZone,
    officeStartMinutes: row.officeStartMinutes,
    officeEndMinutes: row.officeEndMinutes,
    lateGraceMinutes: row.lateGraceMinutes,
    attendanceCutoffMinutes: row.attendanceCutoffMinutes,
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
  return value as unknown as AttendanceScheduleSnapshot;
}

export function snapshotToJson(snapshot: AttendanceScheduleSnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
}

export function toRecordItem(
  row: AttendanceRecord & { employee: Employee },
): AttendanceRecordItem {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeDisplayName: row.employee.displayName,
    employeeCode: row.employee.employeeCode,
    attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
    status: row.status satisfies AttendanceStatus,
    punchInAt: row.punchInAt?.toISOString() ?? null,
    punchOutAt: row.punchOutAt?.toISOString() ?? null,
    lateMinutes: row.lateMinutes,
    workingMinutes: row.workingMinutes,
    scheduleSnapshot: snapshotFromJson(row.scheduleSnapshot),
    finalizedAt: row.finalizedAt?.toISOString() ?? null,
  };
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
