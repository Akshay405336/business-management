import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  OrgCalendarEventListResponse,
  OrgCalendarMonthDay,
  OrgCalendarMonthResponse,
  OrgCalendarEventItem,
} from '@techwin/contracts';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { OrgCalendarNotFoundError } from '../../../../domain/errors/org-calendar.errors.js';
import { assertNoCalendarConflicts } from '../../../../domain/policies/org-calendar-conflict.policy.js';
import type { OrgCalendarRepository } from '../../../../domain/repositories/org-calendar.repository.js';
import {
  classifyDayFromEvents,
  eventAppliesToEmployee,
  eventsOnDate,
  resolveScheduleDayFlags,
  toAttendanceDayKind,
  type ScheduleDayFlags,
} from '../../../../domain/services/org-calendar-classification.service.js';
import type {
  OrgCalendarEventWriteInput,
  OrgCalendarHolidaysQuery,
  OrgCalendarListQuery,
  OrgCalendarMonthQuery,
} from '../../../../domain/types/org-calendar.types.js';
import {
  formatDateOnly as formatZonedDateOnly,
  getZonedParts,
} from '../../../../../attendance/domain/services/attendance-time.service.js';
import {
  calendarDateAnchor,
  defaultColorForType,
  expandAnnualOccurrences,
  monthBoardDateRange,
  monthDateRange,
  parseDateOnly,
  toOrgCalendarEventItem,
} from '../mappers/org-calendar.mapper.js';

function readNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}

const HOLIDAY_FILTER_TYPES = [
  'PUBLIC_HOLIDAY',
  'COMPANY_HOLIDAY',
  'FESTIVAL_REGIONAL',
  'OFFICE_CLOSURE',
  'OPTIONAL_HOLIDAY',
] as const;

@Injectable()
export class PrismaOrgCalendarRepository implements OrgCalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(
    organizationId: string,
    query: OrgCalendarListQuery,
  ): Promise<OrgCalendarEventListResponse> {
    const rows = await this.loadRawEvents(organizationId, query.from, query.to, {
      eventTypes: query.eventTypes,
      search: query.search,
      activeOnly: query.activeOnly,
    });
    const expanded = this.filterExpanded(rows, query.from, query.to, query.eventTypes, query.search);
    const total = expanded.length;
    const start = (query.page - 1) * query.pageSize;
    const items = expanded.slice(start, start + query.pageSize);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getMonth(
    organizationId: string,
    query: OrgCalendarMonthQuery,
  ): Promise<OrgCalendarMonthResponse> {
    const month = monthDateRange(query.year, query.month);
    const board = monthBoardDateRange(query.year, query.month);
    const built = await this.buildMonthResponse(organizationId, board.from, board.to, query, undefined);
    return { from: month.from, to: month.to, days: built.days };
  }

  async getEmployeeMonth(
    organizationId: string,
    employeeId: string,
    query: OrgCalendarMonthQuery,
  ): Promise<OrgCalendarMonthResponse> {
    const month = monthDateRange(query.year, query.month);
    const board = monthBoardDateRange(query.year, query.month);
    const built = await this.buildMonthResponse(
      organizationId,
      board.from,
      board.to,
      query,
      employeeId,
    );
    return { from: month.from, to: month.to, days: built.days };
  }

  async getEvent(organizationId: string, eventId: string): Promise<OrgCalendarEventItem> {
    const row = await this.prisma.organizationCalendarEvent.findFirst({
      where: { id: eventId, organizationId },
    });
    if (!row) throw new OrgCalendarNotFoundError();
    return toOrgCalendarEventItem(row);
  }

  async createEvent(
    organizationId: string,
    adminId: string,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem> {
    const peers = await this.loadExpandedForConflict(organizationId, input.startDate, input.endDate);
    assertNoCalendarConflicts(input, peers);
    const row = await this.prisma.organizationCalendarEvent.create({
      data: this.toCreateData(organizationId, adminId, input),
    });
    return toOrgCalendarEventItem(row);
  }

  async updateEvent(
    organizationId: string,
    eventId: string,
    adminId: string,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem> {
    const existing = await this.prisma.organizationCalendarEvent.findFirst({
      where: { id: eventId, organizationId },
    });
    if (!existing) throw new OrgCalendarNotFoundError();
    const peers = await this.loadExpandedForConflict(organizationId, input.startDate, input.endDate);
    assertNoCalendarConflicts(input, peers, eventId);
    const row = await this.prisma.organizationCalendarEvent.update({
      where: { id: eventId },
      data: {
        title: input.title,
        description: input.description,
        eventType: input.eventType,
        startDate: parseDateOnly(input.startDate),
        endDate: parseDateOnly(input.endDate),
        isFullDay: input.isFullDay,
        startTimeMinutes: input.isFullDay ? null : input.startTimeMinutes,
        endTimeMinutes: input.isFullDay ? null : input.endTimeMinutes,
        color: input.color || defaultColorForType(input.eventType),
        isActive: input.isActive,
        appliesToAllEmployees: input.appliesToAllEmployees,
        employeeIds: input.employeeIds,
        recurrence: input.recurrence,
        updatedByAdminId: adminId,
      },
    });
    return toOrgCalendarEventItem(row);
  }

  async deleteEvent(organizationId: string, eventId: string): Promise<void> {
    const existing = await this.prisma.organizationCalendarEvent.findFirst({
      where: { id: eventId, organizationId },
    });
    if (!existing) throw new OrgCalendarNotFoundError();
    await this.prisma.organizationCalendarEvent.delete({ where: { id: eventId } });
  }

  async listHolidays(
    organizationId: string,
    query: OrgCalendarHolidaysQuery,
  ): Promise<OrgCalendarEventListResponse> {
    const from = query.year ? `${query.year}-01-01` : '2000-01-01';
    const to = query.year ? `${query.year}-12-31` : '2100-12-31';
    const types = query.eventTypes?.length
      ? query.eventTypes
      : [...HOLIDAY_FILTER_TYPES];
    return this.listEvents(organizationId, {
      from,
      to,
      eventTypes: types,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      activeOnly: true,
    });
  }

  async duplicateHolidaysToYear(
    organizationId: string,
    adminId: string,
    sourceYear: number,
    targetYear: number,
    eventTypes?: readonly OrgCalendarEventItem['eventType'][],
  ): Promise<{ created: number }> {
    if (sourceYear === targetYear) return { created: 0 };
    const from = `${sourceYear}-01-01`;
    const to = `${sourceYear}-12-31`;
    const types = eventTypes?.length ? eventTypes : [...HOLIDAY_FILTER_TYPES];
    const rows = await this.loadRawEvents(organizationId, from, to, {
      eventTypes: types,
      activeOnly: true,
    });
    let created = 0;
    for (const item of rows) {
      const startMd = item.startDate.slice(5);
      const endMd = item.endDate.slice(5);
      const newStart = `${targetYear}-${startMd}`;
      const yearSpan = item.startDate.slice(0, 4) !== item.endDate.slice(0, 4);
      const newEnd = yearSpan ? `${targetYear + 1}-${endMd}` : `${targetYear}-${endMd}`;
      const input: OrgCalendarEventWriteInput = {
        title: item.title,
        description: item.description,
        eventType: item.eventType,
        startDate: newStart,
        endDate: newEnd,
        isFullDay: item.isFullDay,
        startTimeMinutes: item.startTimeMinutes,
        endTimeMinutes: item.endTimeMinutes,
        color: item.color,
        isActive: true,
        appliesToAllEmployees: item.appliesToAllEmployees,
        employeeIds: item.employeeIds,
        recurrence: item.recurrence,
      };
      try {
        await this.createEvent(organizationId, adminId, input);
        created += 1;
      } catch {
        // skip duplicates / conflicts
      }
    }
    return { created };
  }

  async exportEvents(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<readonly OrgCalendarEventItem[]> {
    const rows = await this.loadRawEvents(organizationId, from, to, { activeOnly: false });
    return this.filterExpanded(rows, from, to);
  }

  async classifyDateForOrganization(
    organizationId: string,
    attendanceDate: string,
    employeeId?: string,
  ): Promise<'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY'> {
    const scheduleRow = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId, effectiveFrom: { lte: parseDateOnly(attendanceDate) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const scheduleFlags: ScheduleDayFlags = scheduleRow
      ? resolveScheduleDayFlags(
          readNumberArray(scheduleRow.weeklyOffDays),
          readNumberArray(scheduleRow.workingDays),
          getZonedParts(calendarDateAnchor(attendanceDate), scheduleRow.timeZone).weekday,
        )
      : { scheduleWeeklyOff: false, scheduleNonWorking: false };
    return this.resolveAttendanceDayKind(organizationId, attendanceDate, scheduleFlags, employeeId);
  }

  async getDaysInRange(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<readonly OrgCalendarMonthDay[]> {
    const response = await this.buildMonthResponse(
      organizationId,
      from,
      to,
      { year: Number(from.slice(0, 4)), month: Number(from.slice(5, 7)) },
      undefined,
    );
    return response.days;
  }

  async resolveAttendanceDayKind(
    organizationId: string,
    attendanceDate: string,
    schedule: ScheduleDayFlags,
    employeeId?: string,
  ): Promise<'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY'> {
    const rows = await this.loadRawEvents(organizationId, attendanceDate, attendanceDate, {
      activeOnly: true,
    });
    const expanded = expandAnnualOccurrences(rows, attendanceDate, attendanceDate);
    const scoped = expanded.filter((e) => eventAppliesToEmployee(e, employeeId));
    const dayEvents = eventsOnDate(scoped, attendanceDate);
    const kind = classifyDayFromEvents(dayEvents, schedule);
    return toAttendanceDayKind(kind);
  }

  private async buildMonthResponse(
    organizationId: string,
    from: string,
    to: string,
    query: OrgCalendarMonthQuery,
    employeeId?: string,
  ): Promise<OrgCalendarMonthResponse> {
    const scheduleByDate = await this.loadScheduleDayFlagsMap(organizationId, from, to);
    const rows = await this.loadRawEvents(organizationId, from, to, {
      eventTypes: query.eventTypes,
      search: query.search,
      activeOnly: true,
    });
    const expanded = this.filterExpanded(rows, from, to, query.eventTypes, query.search);
    const days: OrgCalendarMonthDay[] = [];
    for (let d = parseDateOnly(from); d <= parseDateOnly(to); d.setUTCDate(d.getUTCDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      const dateEvents = eventsOnDate(expanded, dateKey).filter((e) =>
        eventAppliesToEmployee(e, employeeId),
      );
      const schedule =
        scheduleByDate.get(dateKey) ?? ({ scheduleWeeklyOff: false, scheduleNonWorking: false } satisfies ScheduleDayFlags);
      const dayKind = classifyDayFromEvents(dateEvents, schedule);
      days.push({ date: dateKey, dayKind, events: dateEvents });
    }
    return { from, to, days };
  }

  private async loadScheduleDayFlagsMap(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<Map<string, ScheduleDayFlags>> {
    const schedules = await this.prisma.attendanceSchedule.findMany({
      where: { organizationId, effectiveFrom: { lte: parseDateOnly(to) } },
      orderBy: { effectiveFrom: 'desc' },
    });
    const map = new Map<string, ScheduleDayFlags>();
    for (let d = parseDateOnly(from); d <= parseDateOnly(to); d.setUTCDate(d.getUTCDate() + 1)) {
      const dateKey = d.toISOString().slice(0, 10);
      const schedule = schedules.find((s) => s.effectiveFrom <= parseDateOnly(dateKey));
      if (!schedule) {
        map.set(dateKey, { scheduleWeeklyOff: false, scheduleNonWorking: false });
        continue;
      }
      const parts = getZonedParts(calendarDateAnchor(dateKey), schedule.timeZone);
      map.set(
        dateKey,
        resolveScheduleDayFlags(
          readNumberArray(schedule.weeklyOffDays),
          readNumberArray(schedule.workingDays),
          parts.weekday,
        ),
      );
    }
    return map;
  }

  private async loadExpandedForConflict(
    organizationId: string,
    startDate: string,
    endDate: string,
  ): Promise<OrgCalendarEventItem[]> {
    const rows = await this.loadRawEvents(organizationId, startDate, endDate, { activeOnly: true });
    return expandAnnualOccurrences(rows, startDate, endDate);
  }

  private async loadRawEvents(
    organizationId: string,
    from: string,
    to: string,
    opts?: {
      eventTypes?: readonly string[];
      search?: string;
      activeOnly?: boolean;
    },
  ): Promise<OrgCalendarEventItem[]> {
    const where: Prisma.OrganizationCalendarEventWhereInput = {
      organizationId,
      AND: [
        { startDate: { lte: parseDateOnly(to) } },
        { endDate: { gte: parseDateOnly(from) } },
      ],
    };
    if (opts?.activeOnly !== false) where.isActive = true;
    if (opts?.eventTypes?.length) {
      where.eventType = { in: opts.eventTypes as OrgCalendarEventItem['eventType'][] };
    }
    if (opts?.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    const direct = await this.prisma.organizationCalendarEvent.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { title: 'asc' }],
    });
    const annual = await this.prisma.organizationCalendarEvent.findMany({
      where: {
        organizationId,
        recurrence: 'ANNUAL',
        ...(opts?.activeOnly !== false ? { isActive: true } : {}),
        ...(opts?.eventTypes?.length
          ? { eventType: { in: opts.eventTypes as OrgCalendarEventItem['eventType'][] } }
          : {}),
      },
      orderBy: [{ startDate: 'asc' }, { title: 'asc' }],
    });
    const byId = new Map<string, OrgCalendarEventItem>();
    for (const row of [...direct, ...annual]) {
      byId.set(row.id, toOrgCalendarEventItem(row));
    }
    return [...byId.values()];
  }

  private filterExpanded(
    rows: readonly OrgCalendarEventItem[],
    from: string,
    to: string,
    eventTypes?: readonly string[],
    search?: string,
  ): OrgCalendarEventItem[] {
    let expanded = expandAnnualOccurrences(rows, from, to);
    expanded = expanded.filter((e) => e.startDate <= to && e.endDate >= from);
    if (eventTypes?.length) {
      const set = new Set(eventTypes);
      expanded = expanded.filter((e) => set.has(e.eventType));
    }
    if (search) {
      const q = search.toLowerCase();
      expanded = expanded.filter(
        (e) =>
          e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
      );
    }
    expanded.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
    return expanded;
  }

  async resolveOrganizationTodayKey(organizationId: string): Promise<string> {
    const schedule = await this.prisma.attendanceSchedule.findFirst({
      where: { organizationId },
      orderBy: { effectiveFrom: 'desc' },
      select: { timeZone: true },
    });
    const timeZone = schedule?.timeZone?.trim() || 'UTC';
    return formatZonedDateOnly(getZonedParts(new Date(), timeZone));
  }

  private toCreateData(
    organizationId: string,
    adminId: string,
    input: OrgCalendarEventWriteInput,
  ): Prisma.OrganizationCalendarEventCreateInput {
    return {
      id: randomUUID(),
      organization: { connect: { id: organizationId } },
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      startDate: parseDateOnly(input.startDate),
      endDate: parseDateOnly(input.endDate),
      isFullDay: input.isFullDay,
      startTimeMinutes: input.isFullDay ? null : input.startTimeMinutes,
      endTimeMinutes: input.isFullDay ? null : input.endTimeMinutes,
      color: input.color || defaultColorForType(input.eventType),
      isActive: input.isActive,
      appliesToAllEmployees: input.appliesToAllEmployees,
      employeeIds: input.employeeIds,
      recurrence: input.recurrence,
      createdByAdminId: adminId,
      updatedByAdminId: adminId,
    };
  }
}
