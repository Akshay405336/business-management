import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  AttendanceCalendarDaySummary,
  AttendanceCalendarResponse,
  AttendanceListResponse,
  AttendanceMyTodayResponse,
  AttendanceRecordDetail,
  AttendanceRecordItem,
  AttendanceSettingsResponse,
  AttendanceSummaryResponse,
} from '../../../../domain/read-models/attendance.models.js';
import type {
  AttendanceCalendarQuery,
  AttendanceHistoryQuery,
  AttendanceListQuery,
  AttendanceSummaryQuery,
  CorrectAttendanceRecordInput,
  CreateAttendanceRecordInput,
  RegisterAttendanceDeviceInput,
  UpsertAttendanceSettingsInput,
} from '../../../../domain/types/attendance-inputs.js';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  AttendanceConflictError,
  AttendanceNotFoundError,
  AttendancePolicyError,
} from '../../../../domain/errors/attendance.errors.js';
import { isIpAllowed, isMobileOrTabletUserAgent } from '../../../../domain/policies/device-eligibility.policy.js';
import { applyAttendanceCorrection } from '../../../../domain/policies/attendance-correction.policy.js';
import {
  calculateFinalStatus,
  calculatePunchInStatus,
} from '../../../../domain/policies/attendance-status.policy.js';
import type {
  AttendanceRepository,
  PunchContext,
} from '../../../../domain/repositories/attendance.repository.js';
import {
  ORG_CALENDAR_REPOSITORY,
  type OrgCalendarRepository,
} from '../../../../../organization-calendar/domain/repositories/org-calendar.repository.js';
import { resolveScheduleDayFlags } from '../../../../../organization-calendar/domain/services/org-calendar-classification.service.js';
import { calendarDateAnchor } from '../../../../../organization-calendar/infrastructure/persistence/prisma/mappers/org-calendar.mapper.js';
import {
  formatDateOnly,
  getZonedParts,
  normalizeDaySchedules,
  resolveDayKind,
  resolveOfficeHoursForWeekday,
} from '../../../../domain/services/attendance-time.service.js';
import {
  snapshotFromJson,
  toDeviceItem,
  toRecordDetail,
  toRecordItem,
  toScheduleConfig,
  toScheduleSettings,
  snapshotToJson,
  toScheduleSnapshot,
} from '../mappers/attendance.mapper.js';

function hashDeviceKey(deviceKey: string): string {
  return createHash('sha256').update(deviceKey).digest('hex');
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function emptyCalendarDay(date: string): AttendanceCalendarDaySummary {
  return {
    date,
    present: 0,
    late: 0,
    absent: 0,
    halfDay: 0,
    holiday: 0,
    weeklyOff: 0,
    onLeave: 0,
    pending: 0,
    total: 0,
    organizationDayKind: 'WORKING',
    organizationDayLabel: 'Working day',
  };
}

function organizationDayLabel(kind: AttendanceCalendarDaySummary['organizationDayKind'], eventTitle?: string): string {
  if (eventTitle?.trim()) return eventTitle.trim();
  switch (kind) {
    case 'WEEKLY_OFF':
      return 'Weekly off';
    case 'HOLIDAY':
    case 'OFFICE_CLOSURE':
      return 'Holiday';
    case 'HALF_DAY':
      return 'Half working day';
    case 'SPECIAL_WORKING':
      return 'Special working day';
    case 'NON_WORKING':
      return 'Non-working day';
    default:
      return 'Working day';
  }
}

function incrementCalendarDay(
  summary: AttendanceCalendarDaySummary,
  status: string,
): AttendanceCalendarDaySummary {
  const next = { ...summary, total: summary.total + 1 };
  switch (status) {
    case 'PRESENT':
      return { ...next, present: next.present + 1 };
    case 'LATE':
      return { ...next, late: next.late + 1 };
    case 'ABSENT':
      return { ...next, absent: next.absent + 1 };
    case 'HALF_DAY':
      return { ...next, halfDay: next.halfDay + 1 };
    case 'HOLIDAY':
      return { ...next, holiday: next.holiday + 1 };
    case 'WEEKLY_OFF':
      return { ...next, weeklyOff: next.weeklyOff + 1 };
    case 'ON_LEAVE':
      return { ...next, onLeave: next.onLeave + 1 };
    default:
      return { ...next, pending: next.pending + 1 };
  }
}

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly orgCalendar: OrgCalendarRepository,
  ) {}

  private async resolveAttendanceDayKind(
    organizationId: string,
    attendanceDate: string,
    schedule: NonNullable<Awaited<ReturnType<PrismaAttendanceRepository['resolveScheduleForDate']>>>,
    employeeId?: string,
  ): Promise<'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY'> {
    const weekday = getZonedParts(calendarDateAnchor(attendanceDate), schedule.timeZone).weekday;
    const scheduleFlags = resolveScheduleDayFlags(
      schedule.weeklyOffDays,
      schedule.workingDays,
      weekday,
    );
    return this.orgCalendar.resolveAttendanceDayKind(
      organizationId,
      attendanceDate,
      scheduleFlags,
      employeeId,
    );
  }

  async resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null> {
    const row = await this.prisma.employee.findFirst({
      where: { organizationId, platformAdminId: adminId, employmentStatus: 'ACTIVE', deactivatedAt: null },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async getSettings(organizationId: string): Promise<AttendanceSettingsResponse> {
    const rows = await this.prisma.attendanceSchedule.findMany({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const history = rows.map(toScheduleSettings);
    return { current: history[0] ?? null, history };
  }

  async upsertSettings(
    organizationId: string,
    adminId: string,
    input: UpsertAttendanceSettingsInput,
  ): Promise<AttendanceSettingsResponse> {
    const effectiveFrom = parseDateOnly(input.effectiveFrom);
    const existing = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId, effectiveFrom },
    });
    const data = {
      timeZone: input.timeZone,
      officeStartMinutes: input.officeStartMinutes,
      officeEndMinutes: input.officeEndMinutes,
      lateGraceMinutes: input.lateGraceMinutes,
      attendanceCutoffMinutes: input.attendanceCutoffMinutes,
      minFullDayMinutes: input.minFullDayMinutes,
      minHalfDayMinutes: input.minHalfDayMinutes,
      weeklyOffDays: input.weeklyOffDays,
      workingDays: input.workingDays,
      daySchedules: normalizeDaySchedules(
        input.workingDays,
        input.officeStartMinutes,
        input.officeEndMinutes,
        input.daySchedules,
      ),
      earlyPunchInAllowanceMinutes: input.earlyPunchInAllowanceMinutes,
      requireRegisteredDevice: input.requireRegisteredDevice,
      ipAllowlist: input.ipAllowlist.length > 0 ? input.ipAllowlist : Prisma.DbNull,
      allowPunchOutAfterOfficeEnd: input.allowPunchOutAfterOfficeEnd,
    };
    if (existing) {
      await this.prisma.attendanceSchedule.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.attendanceSchedule.create({
        data: {
          id: randomUUID(),
          organizationId,
          effectiveFrom,
          createdByAdminId: adminId,
          ...data,
        },
      });
    }
    return this.getSettings(organizationId);
  }

  async resolveScheduleForDate(
    organizationId: string,
    attendanceDate: string,
  ): Promise<ReturnType<typeof toScheduleConfig> | null> {
    const row = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId, effectiveFrom: { lte: parseDateOnly(attendanceDate) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    return row ? toScheduleConfig(row) : null;
  }

  async getMyToday(
    organizationId: string,
    employeeId: string,
    now: Date,
    desktopSession: boolean,
  ): Promise<AttendanceMyTodayResponse> {
    const scheduleRow = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
    const schedule = scheduleRow ? toScheduleConfig(scheduleRow) : null;
    const parts = schedule ? getZonedParts(now, schedule.timeZone) : getZonedParts(now, 'UTC');
    const attendanceDate = formatDateOnly(parts);
    const scheduleDayKind = schedule ? resolveDayKind(schedule, parts) : 'WORKING';
    const dayKind = schedule
      ? await this.resolveAttendanceDayKind(organizationId, attendanceDate, schedule, employeeId)
      : scheduleDayKind === 'WEEKLY_OFF'
        ? 'WEEKLY_OFF'
        : 'WORKING';
    const recordRow = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_attendanceDate: {
          organizationId,
          employeeId,
          attendanceDate: parseDateOnly(attendanceDate),
        },
      },
      include: { employee: true },
    });
    const record = recordRow ? toRecordItem(recordRow) : null;
    const activeDevice = await this.prisma.attendanceDevice.count({
      where: { organizationId, employeeId, status: 'ACTIVE' },
    });
    let punchBlockedReason: string | null = null;
    let canPunchIn = false;
    let canPunchOut = false;
    if (!desktopSession) {
      punchBlockedReason = 'Punch in and punch out are only available on desktop browsers.';
    } else if (!schedule) {
      punchBlockedReason = 'Attendance settings have not been configured for your organization.';
    } else if (dayKind === 'WEEKLY_OFF') {
      punchBlockedReason = 'Today is marked as a weekly off day.';
    } else if (dayKind === 'HOLIDAY') {
      punchBlockedReason = 'Today is marked as a holiday or non-working day on the organisation calendar.';
    } else if (record?.punchInAt && !record.punchOutAt) {
      canPunchOut = true;
    } else if (record?.punchOutAt) {
      punchBlockedReason = 'You have already completed attendance for today.';
    } else if (parts.minutesFromMidnight > schedule.attendanceCutoffMinutes) {
      punchBlockedReason = 'The punch-in window for today has closed.';
    } else {
      canPunchIn = true;
    }
    if (schedule?.requireRegisteredDevice && activeDevice === 0) {
      canPunchIn = false;
      canPunchOut = false;
      punchBlockedReason =
        punchBlockedReason ??
        'Register a trusted desktop device before punching attendance.';
    }
    return {
      attendanceDate,
      serverTime: now.toISOString(),
      schedule: schedule ? toScheduleSnapshot(schedule) : null,
      dayKind,
      record,
      canPunchIn,
      canPunchOut,
      punchBlockedReason,
      isDesktopSession: desktopSession,
      trustedDeviceRequired: schedule?.requireRegisteredDevice ?? false,
      hasActiveTrustedDevice: activeDevice > 0,
    };
  }

  async punchIn(ctx: PunchContext): Promise<AttendanceRecordItem> {
    if (ctx.idempotencyKey) {
      const existing = await this.prisma.attendanceRecord.findFirst({
        where: {
          organizationId: ctx.organizationId,
          employeeId: ctx.employeeId,
          punchInIdempotencyKey: ctx.idempotencyKey,
        },
        include: { employee: true },
      });
      if (existing?.punchInAt) return toRecordItem(existing);
    }
    await this.assertPunchAllowed(ctx);
    const schedule = await this.requireSchedule(ctx.organizationId, ctx.now);
    const parts = getZonedParts(ctx.now, schedule.timeZone);
    const attendanceDate = formatDateOnly(parts);
    const attendanceDayKind = await this.resolveAttendanceDayKind(
      ctx.organizationId,
      attendanceDate,
      schedule,
      ctx.employeeId,
    );
    if (attendanceDayKind === 'WEEKLY_OFF') {
      throw new AttendancePolicyError('Cannot punch in on a weekly off day.');
    }
    if (attendanceDayKind === 'HOLIDAY') {
      throw new AttendancePolicyError('Cannot punch in on a holiday or non-working day.');
    }
    if (parts.minutesFromMidnight > schedule.attendanceCutoffMinutes) {
      throw new AttendancePolicyError('Punch-in is not allowed after the attendance cutoff time.');
    }
    const device = await this.resolveActiveDevice(ctx);
    const officeHours = resolveOfficeHoursForWeekday(schedule, parts.weekday);
    const { status, lateMinutes } = calculatePunchInStatus(
      schedule,
      parts.minutesFromMidnight,
      officeHours.startMinutes,
    );
    try {
      const created = await this.prisma.attendanceRecord.create({
        data: {
          id: randomUUID(),
          organizationId: ctx.organizationId,
          employeeId: ctx.employeeId,
          attendanceDate: parseDateOnly(attendanceDate),
          scheduleId: schedule.scheduleId,
          scheduleSnapshot: snapshotToJson(toScheduleSnapshot(schedule)),
          status,
          punchInAt: ctx.now,
          lateMinutes,
          punchInDeviceId: device?.id ?? null,
          punchInUserAgent: ctx.userAgent?.slice(0, 512) ?? null,
          punchInIp: ctx.ipAddress?.slice(0, 64) ?? null,
          punchInIdempotencyKey: ctx.idempotencyKey ?? null,
        },
        include: { employee: true },
      });
      if (device) {
        await this.prisma.attendanceDevice.update({
          where: { id: device.id },
          data: { lastUsedAt: ctx.now },
        });
      }
      return toRecordItem(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AttendanceConflictError('Attendance for today is already recorded.');
      }
      throw error;
    }
  }

  async punchOut(ctx: PunchContext): Promise<AttendanceRecordItem> {
    if (ctx.idempotencyKey) {
      const existing = await this.prisma.attendanceRecord.findFirst({
        where: {
          organizationId: ctx.organizationId,
          employeeId: ctx.employeeId,
          punchOutIdempotencyKey: ctx.idempotencyKey,
        },
        include: { employee: true },
      });
      if (existing?.punchOutAt) return toRecordItem(existing);
    }
    await this.assertPunchAllowed(ctx);
    const schedule = await this.requireSchedule(ctx.organizationId, ctx.now);
    const parts = getZonedParts(ctx.now, schedule.timeZone);
    const attendanceDate = formatDateOnly(parts);
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_attendanceDate: {
          organizationId: ctx.organizationId,
          employeeId: ctx.employeeId,
          attendanceDate: parseDateOnly(attendanceDate),
        },
      },
      include: { employee: true },
    });
    if (!record?.punchInAt) {
      throw new AttendancePolicyError('Punch out requires an active punch-in for today.');
    }
    if (record.punchOutAt) {
      throw new AttendanceConflictError('You have already punched out for today.');
    }
    const device = await this.resolveActiveDevice(ctx);
    const snapshot = snapshotFromJson(record.scheduleSnapshot);
    const punchInStatus = record.status as 'PRESENT' | 'LATE' | 'PENDING';
    const final = calculateFinalStatus(
      { ...schedule, ...snapshot, scheduleId: snapshot.scheduleId },
      record.punchInAt,
      ctx.now,
      record.lateMinutes,
      punchInStatus === 'PENDING' ? 'PRESENT' : punchInStatus,
    );
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        punchOutAt: ctx.now,
        status: final.status,
        workingMinutes: final.workingMinutes,
        lateMinutes: final.lateMinutes,
        punchOutDeviceId: device?.id ?? null,
        punchOutUserAgent: ctx.userAgent?.slice(0, 512) ?? null,
        punchOutIp: ctx.ipAddress?.slice(0, 64) ?? null,
        punchOutIdempotencyKey: ctx.idempotencyKey ?? null,
        finalizedAt: ctx.now,
      },
      include: { employee: true },
    });
    if (device) {
      await this.prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: ctx.now },
      });
    }
    return toRecordItem(updated);
  }

  async listRecords(organizationId: string, query: AttendanceListQuery): Promise<AttendanceListResponse> {
    const where: Prisma.AttendanceRecordWhereInput = { organizationId };
    if (query.date) where.attendanceDate = parseDateOnly(query.date);
    if (query.from || query.to) {
      where.attendanceDate = {
        ...(query.from ? { gte: parseDateOnly(query.from) } : {}),
        ...(query.to ? { lte: parseDateOnly(query.to) } : {}),
      };
    }
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.lateOnly) where.status = 'LATE';
    if (query.absentOnly) where.status = 'ABSENT';
    const employeeFilter: Prisma.EmployeeWhereInput = {};
    if (query.department) employeeFilter.department = query.department;
    if (query.search?.trim()) {
      const term = query.search.trim();
      employeeFilter.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { workEmail: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.count({ where }),
      this.prisma.attendanceRecord.findMany({
        where,
        include: { employee: true },
        orderBy: [{ attendanceDate: 'desc' }, { punchInAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(toRecordItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getCalendarSummary(
    organizationId: string,
    query: AttendanceCalendarQuery,
  ): Promise<AttendanceCalendarResponse> {
    const where: Prisma.AttendanceRecordWhereInput = {
      organizationId,
      attendanceDate: {
        gte: parseDateOnly(query.from),
        lte: parseDateOnly(query.to),
      },
    };
    if (query.status) where.status = query.status;
    const employeeFilter: Prisma.EmployeeWhereInput = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      employeeFilter.OR = [
        { displayName: { contains: term, mode: 'insensitive' } },
        { workEmail: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(employeeFilter).length > 0) {
      where.employee = employeeFilter;
    }
    const rows = await this.prisma.attendanceRecord.findMany({
      where,
      select: { attendanceDate: true, status: true },
    });
    const byDate = new Map<string, AttendanceCalendarDaySummary>();
    for (const row of rows) {
      const date = row.attendanceDate.toISOString().slice(0, 10);
      const current = byDate.get(date) ?? emptyCalendarDay(date);
      byDate.set(date, incrementCalendarDay(current, row.status));
    }
    const orgDays = await this.orgCalendar.getDaysInRange(organizationId, query.from, query.to);
    for (const orgDay of orgDays) {
      const current = byDate.get(orgDay.date) ?? emptyCalendarDay(orgDay.date);
      const eventTitle = orgDay.events[0]?.title;
      byDate.set(orgDay.date, {
        ...current,
        organizationDayKind: orgDay.dayKind,
        organizationDayLabel: organizationDayLabel(orgDay.dayKind, eventTitle),
      });
    }
    for (let d = parseDateOnly(query.from); d <= parseDateOnly(query.to); d.setUTCDate(d.getUTCDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, emptyCalendarDay(dateKey));
      }
    }
    const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    return { from: query.from, to: query.to, days };
  }

  async createManualRecord(
    organizationId: string,
    adminId: string,
    input: CreateAttendanceRecordInput,
  ): Promise<AttendanceRecordDetail> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: input.employeeId,
        organizationId,
        employmentStatus: 'ACTIVE',
        deactivatedAt: null,
      },
    });
    if (!employee) {
      throw new AttendanceNotFoundError('Employee');
    }
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_attendanceDate: {
          organizationId,
          employeeId: input.employeeId,
          attendanceDate: parseDateOnly(input.attendanceDate),
        },
      },
    });
    if (existing) {
      throw new AttendanceConflictError(
        'An attendance record already exists for this employee on this date. Edit the existing record instead.',
      );
    }
    const schedule = await this.resolveScheduleForDate(organizationId, input.attendanceDate);
    if (!schedule) {
      throw new AttendancePolicyError('No attendance schedule is configured for this date.');
    }
    const today = formatDateOnly(getZonedParts(new Date(), schedule.timeZone));
    if (input.attendanceDate > today) {
      throw new AttendancePolicyError('Attendance cannot be recorded for a future date.');
    }
    const snapshot = toScheduleSnapshot(schedule);
    const corrected = applyAttendanceCorrection({
      attendanceDate: input.attendanceDate,
      scheduleSnapshot: snapshot,
      current: { punchInAt: null, punchOutAt: null, status: 'PENDING' },
      patch: {
        reason: input.reason,
        punchInAt: input.punchInAt,
        punchOutAt: input.punchOutAt,
        status: input.status,
      },
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.attendanceRecord.create({
        data: {
          id: randomUUID(),
          organizationId,
          employeeId: input.employeeId,
          attendanceDate: parseDateOnly(input.attendanceDate),
          scheduleId: schedule.scheduleId,
          scheduleSnapshot: snapshotToJson(snapshot),
          status: corrected.status,
          punchInAt: corrected.punchInAt,
          punchOutAt: corrected.punchOutAt,
          lateMinutes: corrected.lateMinutes,
          workingMinutes: corrected.workingMinutes,
          finalizedAt: new Date(),
        },
        include: { employee: true, corrections: { orderBy: { createdAt: 'desc' } } },
      });
      await tx.attendanceCorrection.create({
        data: {
          id: randomUUID(),
          organizationId,
          attendanceRecordId: record.id,
          adminId,
          reason: input.reason,
          previousValues: { created: false },
          newValues: {
            punchInAt: corrected.punchInAt?.toISOString() ?? null,
            punchOutAt: corrected.punchOutAt?.toISOString() ?? null,
            status: corrected.status,
            workingMinutes: corrected.workingMinutes,
            lateMinutes: corrected.lateMinutes,
            employeeId: input.employeeId,
            attendanceDate: input.attendanceDate,
          },
        },
      });
      return tx.attendanceRecord.findFirstOrThrow({
        where: { id: record.id },
        include: { employee: true, corrections: { orderBy: { createdAt: 'desc' } } },
      });
    });
    return toRecordDetail(created);
  }

  async getRecordDetail(organizationId: string, recordId: string): Promise<AttendanceRecordDetail> {
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { id: recordId, organizationId },
      include: { employee: true, corrections: { orderBy: { createdAt: 'desc' } } },
    });
    if (!row) throw new AttendanceNotFoundError();
    return toRecordDetail(row);
  }

  async listMyHistory(
    organizationId: string,
    employeeId: string,
    query: AttendanceHistoryQuery,
  ): Promise<readonly AttendanceRecordItem[]> {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        employeeId,
        attendanceDate: { gte: parseDateOnly(query.from), lte: parseDateOnly(query.to) },
        ...(query.status ? { status: query.status } : {}),
      },
      include: { employee: true },
      orderBy: { attendanceDate: 'desc' },
    });
    return rows.map(toRecordItem);
  }

  async getMySummary(
    organizationId: string,
    employeeId: string,
    query: AttendanceSummaryQuery,
  ): Promise<AttendanceSummaryResponse> {
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        employeeId,
        attendanceDate: { gte: parseDateOnly(query.from), lte: parseDateOnly(query.to) },
      },
      select: { status: true, workingMinutes: true },
    });
    const count = (status: string) => rows.filter((r) => r.status === status).length;
    return {
      from: query.from,
      to: query.to,
      presentDays: count('PRESENT'),
      lateDays: count('LATE'),
      absentDays: count('ABSENT'),
      halfDays: count('HALF_DAY'),
      pendingDays: count('PENDING'),
      weeklyOffDays: count('WEEKLY_OFF'),
      holidayDays: count('HOLIDAY'),
      totalWorkingMinutes: rows.reduce((sum, r) => sum + (r.workingMinutes ?? 0), 0),
    };
  }

  async correctRecord(
    organizationId: string,
    adminId: string,
    recordId: string,
    input: CorrectAttendanceRecordInput,
  ): Promise<AttendanceRecordDetail> {
    const row = await this.prisma.attendanceRecord.findFirst({
      where: { id: recordId, organizationId },
      include: { employee: true, corrections: true },
    });
    if (!row) throw new AttendanceNotFoundError();
    const snapshot = snapshotFromJson(row.scheduleSnapshot);
    const previousValues = {
      punchInAt: row.punchInAt?.toISOString() ?? null,
      punchOutAt: row.punchOutAt?.toISOString() ?? null,
      status: row.status,
      workingMinutes: row.workingMinutes,
      lateMinutes: row.lateMinutes,
    };
    const corrected = applyAttendanceCorrection({
      attendanceDate: row.attendanceDate.toISOString().slice(0, 10),
      scheduleSnapshot: snapshot,
      current: {
        punchInAt: row.punchInAt,
        punchOutAt: row.punchOutAt,
        status: row.status,
      },
      patch: input,
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.attendanceRecord.update({
        where: { id: row.id },
        data: {
          punchInAt: corrected.punchInAt,
          punchOutAt: corrected.punchOutAt,
          status: corrected.status,
          workingMinutes: corrected.workingMinutes,
          lateMinutes: corrected.lateMinutes,
          finalizedAt: new Date(),
        },
        include: { employee: true, corrections: { orderBy: { createdAt: 'desc' } } },
      });
      await tx.attendanceCorrection.create({
        data: {
          id: randomUUID(),
          organizationId,
          attendanceRecordId: row.id,
          adminId,
          reason: input.reason,
          previousValues,
          newValues: {
            punchInAt: corrected.punchInAt?.toISOString() ?? null,
            punchOutAt: corrected.punchOutAt?.toISOString() ?? null,
            status: corrected.status,
            workingMinutes: corrected.workingMinutes,
            lateMinutes: corrected.lateMinutes,
          },
        },
      });
      return next;
    });
    return toRecordDetail(updated);
  }

  async listDevices(organizationId: string, employeeId: string) {
    const rows = await this.prisma.attendanceDevice.findMany({
      where: { organizationId, employeeId },
      orderBy: { registeredAt: 'desc' },
    });
    return rows.map(toDeviceItem);
  }

  async registerDevice(
    organizationId: string,
    employeeId: string,
    adminId: string,
    userAgent: string | null,
    input: RegisterAttendanceDeviceInput,
  ) {
    if (isMobileOrTabletUserAgent(userAgent)) {
      throw new AttendancePolicyError('Trusted devices can only be registered from desktop browsers.');
    }
    const row = await this.prisma.attendanceDevice.upsert({
      where: {
        organizationId_employeeId_deviceKeyHash: {
          organizationId,
          employeeId,
          deviceKeyHash: hashDeviceKey(input.deviceKey),
        },
      },
      create: {
        id: randomUUID(),
        organizationId,
        employeeId,
        platformAdminId: adminId,
        deviceKeyHash: hashDeviceKey(input.deviceKey),
        label: input.label,
        userAgentHint: userAgent?.slice(0, 512) ?? '',
        status: 'ACTIVE',
      },
      update: {
        label: input.label,
        status: 'ACTIVE',
        revokedAt: null,
        userAgentHint: userAgent?.slice(0, 512) ?? '',
      },
    });
    return toDeviceItem(row);
  }

  async revokeDevice(organizationId: string, employeeId: string, deviceId: string): Promise<void> {
    const row = await this.prisma.attendanceDevice.findFirst({
      where: { id: deviceId, organizationId, employeeId },
    });
    if (!row) throw new AttendanceNotFoundError('Device');
    await this.prisma.attendanceDevice.update({
      where: { id: deviceId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
  }

  async listOrganizationIdsWithSchedules(): Promise<readonly string[]> {
    const rows = await this.prisma.attendanceSchedule.findMany({
      distinct: ['organizationId'],
      select: { organizationId: true },
    });
    return rows.map((r) => r.organizationId);
  }

  async processAbsentForOrganization(organizationId: string, now: Date): Promise<number> {
    const scheduleRow = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!scheduleRow) return 0;
    const schedule = toScheduleConfig(scheduleRow);
    const parts = getZonedParts(now, schedule.timeZone);
    if (parts.minutesFromMidnight < schedule.attendanceCutoffMinutes) return 0;
    const attendanceDate = parseDateOnly(formatDateOnly(parts));
    const attendanceDateKey = formatDateOnly(parts);
    if (
      (await this.resolveAttendanceDayKind(organizationId, attendanceDateKey, schedule)) !== 'WORKING'
    ) {
      return 0;
    }
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, employmentStatus: 'ACTIVE', deactivatedAt: null },
      select: { id: true },
    });
    let marked = 0;
    for (const employee of employees) {
      const existing = await this.prisma.attendanceRecord.findUnique({
        where: {
          organizationId_employeeId_attendanceDate: {
            organizationId,
            employeeId: employee.id,
            attendanceDate,
          },
        },
      });
      if (existing?.punchInAt) continue;
      if (existing?.status === 'ABSENT' && existing.finalizedAt) continue;
      await this.prisma.attendanceRecord.upsert({
        where: {
          organizationId_employeeId_attendanceDate: {
            organizationId,
            employeeId: employee.id,
            attendanceDate,
          },
        },
        create: {
          id: randomUUID(),
          organizationId,
          employeeId: employee.id,
          attendanceDate,
          scheduleId: schedule.scheduleId,
          scheduleSnapshot: snapshotToJson(toScheduleSnapshot(schedule)),
          status: 'ABSENT',
          finalizedAt: now,
          finalizationNote: 'Marked absent after attendance cutoff.',
        },
        update: {
          status: 'ABSENT',
          finalizedAt: now,
          finalizationNote: 'Marked absent after attendance cutoff.',
        },
      });
      marked += 1;
    }
    return marked;
  }

  async processIncompleteForOrganization(organizationId: string, now: Date): Promise<number> {
    const scheduleRow = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!scheduleRow) return 0;
    const schedule = toScheduleConfig(scheduleRow);
    const parts = getZonedParts(now, schedule.timeZone);
    const officeHours = resolveOfficeHoursForWeekday(schedule, parts.weekday);
    const attendanceDateKey = formatDateOnly(parts);
    if (
      (await this.resolveAttendanceDayKind(organizationId, attendanceDateKey, schedule)) !== 'WORKING'
    ) {
      return 0;
    }
    if (parts.minutesFromMidnight < officeHours.endMinutes) return 0;
    const attendanceDate = parseDateOnly(formatDateOnly(parts));
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        attendanceDate,
        punchInAt: { not: null },
        punchOutAt: null,
        finalizedAt: null,
      },
    });
    let count = 0;
    for (const row of rows) {
      const snapshot = snapshotFromJson(row.scheduleSnapshot);
      const final = calculateFinalStatus(
        { ...schedule, ...snapshot, scheduleId: snapshot.scheduleId },
        row.punchInAt,
        null,
        row.lateMinutes,
        row.status === 'LATE' ? 'LATE' : 'PRESENT',
      );
      await this.prisma.attendanceRecord.update({
        where: { id: row.id },
        data: {
          status: final.status,
          finalizedAt: now,
          finalizationNote: 'Finalized without punch-out.',
        },
      });
      count += 1;
    }
    return count;
  }

  private async requireSchedule(organizationId: string, now: Date) {
    const latest = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!latest) {
      throw new AttendancePolicyError('Attendance settings are not configured.');
    }
    const parts = getZonedParts(now, latest.timeZone);
    const schedule = await this.resolveScheduleForDate(organizationId, formatDateOnly(parts));
    if (!schedule) {
      throw new AttendancePolicyError('Attendance settings are not configured.');
    }
    return schedule;
  }

  private async assertPunchAllowed(ctx: PunchContext): Promise<void> {
    if (isMobileOrTabletUserAgent(ctx.userAgent)) {
      await this.logSecurity(ctx, 'PUNCH_REJECTED_MOBILE', 'Mobile or tablet punch attempt rejected.');
      throw new AttendancePolicyError('Punch in/out is only allowed from desktop browsers.', 'ATTENDANCE_DESKTOP_ONLY');
    }
    const employee = await this.prisma.employee.findFirst({
      where: { id: ctx.employeeId, organizationId: ctx.organizationId },
      select: { employmentStatus: true, deactivatedAt: true },
    });
    if (!employee || employee.employmentStatus !== 'ACTIVE' || employee.deactivatedAt) {
      throw new AttendancePolicyError('Employee is not eligible to punch attendance.');
    }
  }

  private async resolveActiveDevice(ctx: PunchContext) {
    const schedule = await this.requireSchedule(ctx.organizationId, ctx.now);
    if (!isIpAllowed(ctx.ipAddress, schedule.ipAllowlist)) {
      await this.logSecurity(ctx, 'PUNCH_REJECTED_IP', 'Punch attempt rejected by IP allowlist.');
      throw new AttendancePolicyError('Your network is not permitted for attendance punching.');
    }
    if (!schedule.requireRegisteredDevice) return null;
    if (!ctx.deviceKey) {
      await this.logSecurity(ctx, 'PUNCH_REJECTED_UNREGISTERED', 'Missing trusted device key.');
      throw new AttendancePolicyError('A registered trusted device is required.');
    }
    const device = await this.prisma.attendanceDevice.findFirst({
      where: {
        organizationId: ctx.organizationId,
        employeeId: ctx.employeeId,
        deviceKeyHash: hashDeviceKey(ctx.deviceKey),
        status: 'ACTIVE',
      },
    });
    if (!device) {
      await this.logSecurity(ctx, 'PUNCH_REJECTED_UNREGISTERED', 'Unknown or revoked device key.');
      throw new AttendancePolicyError('This device is not registered for attendance.');
    }
    return device;
  }

  private async logSecurity(
    ctx: PunchContext,
    eventType:
      | 'PUNCH_REJECTED_MOBILE'
      | 'PUNCH_REJECTED_UNREGISTERED'
      | 'PUNCH_REJECTED_IP'
      | 'PUNCH_REJECTED_POLICY',
    message: string,
  ): Promise<void> {
    await this.prisma.attendanceSecurityEvent.create({
      data: {
        id: randomUUID(),
        organizationId: ctx.organizationId,
        employeeId: ctx.employeeId,
        adminId: ctx.adminId,
        eventType,
        message,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
        ipAddress: ctx.ipAddress?.slice(0, 64) ?? null,
      },
    });
  }
}
