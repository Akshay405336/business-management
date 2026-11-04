import { Inject, Injectable } from '@nestjs/common';
import type {
  OrgCalendarEventItem,
  OrgCalendarEventListResponse,
  OrgCalendarMonthResponse,
} from '@techwin/contracts';
import {
  ORG_CALENDAR_REPOSITORY,
  type OrgCalendarRepository,
} from '../domain/repositories/org-calendar.repository.js';
import type { OrgCalendarEventWriteInput } from '../domain/types/org-calendar.types.js';
import { OrgCalendarAuthorizationService } from './services/org-calendar-authorization.service.js';
import { OrgCalendarAttendanceReconcileService } from './services/org-calendar-attendance-reconcile.service.js';
import { listDateKeysInclusive } from './shared/org-calendar-date-range.js';
import type { OrgAccessActor } from '../../org-access/index.js';

@Injectable()
export class ListOrgCalendarEventsHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: Parameters<OrgCalendarRepository['listEvents']>[1],
  ): Promise<OrgCalendarEventListResponse> {
    await this.authz.requirePermissions(actor, ['calendar.view', 'calendar.view_all']);
    return this.repository.listEvents(actor.organizationId, query);
  }
}

@Injectable()
export class GetOrgCalendarMonthHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: Parameters<OrgCalendarRepository['getMonth']>[1],
  ): Promise<OrgCalendarMonthResponse> {
    await this.authz.requirePermissions(actor, ['calendar.view', 'calendar.view_all']);
    return this.repository.getMonth(actor.organizationId, query);
  }
}

@Injectable()
export class GetEmployeeOrgCalendarMonthHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: Parameters<OrgCalendarRepository['getEmployeeMonth']>[2],
  ): Promise<OrgCalendarMonthResponse> {
    await this.authz.requirePermissions(actor, ['calendar.view']);
    const employeeId = await this.authz.requireEmployeeId(actor);
    return this.repository.getEmployeeMonth(actor.organizationId, employeeId, query);
  }
}

@Injectable()
export class GetOrgCalendarEventHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(actor: OrgAccessActor, eventId: string): Promise<OrgCalendarEventItem> {
    await this.authz.requirePermissions(actor, ['calendar.view', 'calendar.view_all']);
    return this.repository.getEvent(actor.organizationId, eventId);
  }
}

@Injectable()
export class CreateOrgCalendarEventHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
    private readonly reconcile: OrgCalendarAttendanceReconcileService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem> {
    await this.authz.requirePermissions(actor, ['calendar.create']);
    const item = await this.repository.createEvent(actor.organizationId, actor.adminId, input);
    await this.reconcile.reconcileDateRange(
      actor.organizationId,
      input.startDate,
      input.endDate,
    );
    return item;
  }
}

@Injectable()
export class UpdateOrgCalendarEventHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
    private readonly reconcile: OrgCalendarAttendanceReconcileService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    eventId: string,
    input: OrgCalendarEventWriteInput,
  ): Promise<OrgCalendarEventItem> {
    await this.authz.requirePermissions(actor, ['calendar.update']);
    const previous = await this.repository.getEvent(actor.organizationId, eventId);
    const item = await this.repository.updateEvent(actor.organizationId, eventId, actor.adminId, input);
    const dates = new Set([
      ...listDateKeysInclusive(previous.startDate, previous.endDate),
      ...listDateKeysInclusive(input.startDate, input.endDate),
    ]);
    for (const date of dates) {
      await this.reconcile.reconcileDate(actor.organizationId, date);
    }
    return item;
  }
}

@Injectable()
export class DeleteOrgCalendarEventHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
    private readonly reconcile: OrgCalendarAttendanceReconcileService,
  ) {}

  async execute(actor: OrgAccessActor, eventId: string): Promise<void> {
    await this.authz.requirePermissions(actor, ['calendar.delete']);
    const previous = await this.repository.getEvent(actor.organizationId, eventId);
    await this.repository.deleteEvent(actor.organizationId, eventId);
    await this.reconcile.reconcileDateRange(
      actor.organizationId,
      previous.startDate,
      previous.endDate,
    );
  }
}

@Injectable()
export class ListOrgCalendarHolidaysHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    query: Parameters<OrgCalendarRepository['listHolidays']>[1],
  ): Promise<OrgCalendarEventListResponse> {
    await this.authz.requirePermissions(actor, ['calendar.manage_holidays', 'calendar.view_all']);
    return this.repository.listHolidays(actor.organizationId, query);
  }
}

@Injectable()
export class DuplicateOrgCalendarHolidaysHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
    private readonly reconcile: OrgCalendarAttendanceReconcileService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    sourceYear: number,
    targetYear: number,
    eventTypes?: readonly OrgCalendarEventItem['eventType'][],
  ): Promise<{ created: number }> {
    await this.authz.requirePermissions(actor, ['calendar.manage_holidays']);
    const result = await this.repository.duplicateHolidaysToYear(
      actor.organizationId,
      actor.adminId,
      sourceYear,
      targetYear,
      eventTypes,
    );
    await this.reconcile.reconcileDateRange(
      actor.organizationId,
      `${targetYear}-01-01`,
      `${targetYear}-12-31`,
    );
    return result;
  }
}

@Injectable()
export class ExportOrgCalendarHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    from: string,
    to: string,
  ): Promise<readonly OrgCalendarEventItem[]> {
    await this.authz.requirePermissions(actor, ['calendar.export', 'calendar.view_all']);
    return this.repository.exportEvents(actor.organizationId, from, to);
  }
}

@Injectable()
export class ClassifyOrgCalendarDateHandler {
  constructor(
    @Inject(ORG_CALENDAR_REPOSITORY) private readonly repository: OrgCalendarRepository,
    private readonly authz: OrgCalendarAuthorizationService,
  ) {}

  async execute(
    actor: OrgAccessActor,
    date: string,
  ): Promise<{ date: string; dayKind: 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY' }> {
    await this.authz.requirePermissions(actor, ['calendar.view', 'calendar.view_all', 'tasks.assign']);
    const dayKind = await this.repository.classifyDateForOrganization(actor.organizationId, date);
    return { date, dayKind };
  }
}
