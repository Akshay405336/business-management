import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { TaskCalendarDayBucketDto, TaskCalendarResponse, TaskCalendarTaskDto } from '@techwin/contracts';
import { projectTaskStatusSchema } from '@techwin/validation';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import { DailyTaskAuthorizationService } from '../../../daily-tasks/application/services/daily-task-authorization.service.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../../daily-tasks/domain/repositories/daily-task.repository.js';
import type { MyDailyTasksQuery } from '../../../daily-tasks/domain/types/daily-task-inputs.js';
import type { DailyTaskListQuery } from '../../../daily-tasks/domain/types/daily-task-inputs.js';
import {
  fromDailyTaskListItem,
  fromProjectTaskRow,
} from '../../domain/entities/calendar-task.entity.js';
import { assertValidCalendarDateRange } from '../../domain/policies/calendar-date-range.policy.js';
import { expandTasksToCalendarDays } from '../../domain/services/calendar-task-grouping.service.js';
import type { CalendarNormalizedTask } from '../../domain/types/calendar-task.types.js';
import { CalendarDateRange } from '../../domain/value-objects/calendar-date-range.vo.js';
import type { OrgTaskCalendarDataPort } from '../integration/org-task-calendar-data.port.js';
import { ORG_TASK_CALENDAR_DATA } from '../integration/org-task-calendar-data.port.js';
import type { ListCalendarTasksQuery } from './list-calendar-tasks.query.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toDto(task: CalendarNormalizedTask): TaskCalendarTaskDto {
  return { ...task };
}

function buildCalendarResponse(
  normalized: CalendarNormalizedTask[],
  range: CalendarDateRange,
): TaskCalendarResponse {
  const tasks = normalized.map(toDto);
  const byDay = expandTasksToCalendarDays(normalized, range.startDate, range.endDate);

  const days: TaskCalendarDayBucketDto[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, dayTasks]) => {
      const assignees = new Set<string>();
      for (const t of dayTasks) {
        for (const id of t.assigneeEmployeeIds) assignees.add(id);
      }
      return {
        date,
        tasks: dayTasks.map(toDto),
        taskCount: dayTasks.length,
        distinctAssigneeCount: assignees.size,
      };
    });

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    tasks,
    days,
  };
}

@Injectable()
export class ListCalendarTasksHandler {
  constructor(
    @Inject(ORG_TASK_CALENDAR_DATA) private readonly data: OrgTaskCalendarDataPort,
    @Inject(DailyTaskAuthorizationService) private readonly dailyTaskAuthz: DailyTaskAuthorizationService,
    @Inject(DAILY_TASK_REPOSITORY) private readonly dailyTasks: DailyTaskRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async execute(input: ListCalendarTasksQuery): Promise<TaskCalendarResponse> {
    const { organizationId, clientToday, accessActor, query } = input;
    const effective = await this.dailyTaskAuthz.resolveEffective(accessActor);
    const orgWide = this.dailyTaskAuthz.canManageOrganizationTasks(accessActor, effective);

    const effectiveToday = query.clientToday ?? clientToday;
    const startDate = query.startDate;
    const endDate = query.endDate;
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required.');
    }

    const range = CalendarDateRange.create(startDate, endDate);
    assertValidCalendarDateRange(range);

    if (!orgWide) {
      return this.listSelfScoped({
        organizationId,
        adminId: accessActor.adminId,
        clientToday: effectiveToday,
        query,
        range,
      });
    }

    const noteAttach = await this.dailyTaskAuthz.resolveNoteAttach(accessActor);

    const includeDaily = !query.source || query.source === 'DAILY_TASK';
    const includeProject = !query.source || query.source === 'PROJECT_TASK';

    let workflowStageId = query.workflowStageId;
    if (includeDaily && query.status && !workflowStageId) {
      if (UUID_RE.test(query.status)) {
        workflowStageId = query.status;
      } else {
        const stages = await this.dailyTasks.listWorkflowStages(organizationId);
        const match = stages.find((s) => s.stageKey === query.status);
        if (match) workflowStageId = match.id;
      }
    }

    const projectStatusParsed = projectTaskStatusSchema.safeParse(query.status);
    const projectTaskStatusFilter =
      includeProject && projectStatusParsed.success ? projectStatusParsed.data : undefined;

    const dailyQuery: DailyTaskListQuery = {
      page: 1,
      pageSize: 100,
      calendarRangeStart: range.startDate,
      calendarRangeEnd: range.endDate,
      search: query.search?.trim() || undefined,
      type: query.type,
      employeeId: query.employeeId,
      projectId: query.projectId,
      priority: query.priority,
      workflowStageId,
      projectPhaseId: query.projectPhaseId,
      category: query.category,
      completedOnly: query.completedOnly,
      overdueOnly: query.overdueOnly,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    };

    const [dailyItems, projectRows] = await Promise.all([
      includeDaily
        ? this.data.listDailyTasksInRange(organizationId, dailyQuery, effectiveToday, noteAttach)
        : Promise.resolve([] as const),
      includeProject
        ? this.data.listProjectTasksForCalendar(organizationId, {
            startDate: range.startDate,
            endDate: range.endDate,
            search: query.search,
            projectId: query.projectId,
            employeeId: query.employeeId,
            priority: query.projectTaskPriority,
            status: projectTaskStatusFilter,
          })
        : Promise.resolve([] as const),
    ]);

    let normalized: CalendarNormalizedTask[] = [];
    if (includeDaily) {
      normalized = normalized.concat(
        dailyItems.map((t) => fromDailyTaskListItem(t, effectiveToday)),
      );
    }
    if (includeProject) {
      normalized = normalized.concat(
        projectRows
          .map((t) => fromProjectTaskRow(t, effectiveToday))
          .filter((t): t is CalendarNormalizedTask => t !== null),
      );
    }

    if (query.displayStatus) {
      normalized = normalized.filter((t) => t.displayStatus === query.displayStatus);
    }

    if (includeDaily && query.status && !workflowStageId) {
      normalized = normalized.filter(
        (t) =>
          t.source !== 'DAILY_TASK' ||
          (t.workflowStageKey !== null && t.workflowStageKey === query.status) ||
          t.statusLabel === query.status ||
          t.statusDetail === query.status,
      );
    }

    return buildCalendarResponse(normalized, range);
  }

  private async listSelfScoped(input: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly clientToday: string;
    readonly query: ListCalendarTasksQuery['query'];
    readonly range: CalendarDateRange;
  }): Promise<TaskCalendarResponse> {
    const accessActor = {
      organizationId: input.organizationId,
      adminId: input.adminId,
      isPlatformSuperAdmin: false,
    };
    const noteAttach = await this.dailyTaskAuthz.resolveNoteAttach(accessActor);

    const employee = await this.prisma.employee.findFirst({
      where: { organizationId: input.organizationId, platformAdminId: input.adminId },
      select: { id: true },
    });
    if (!employee) {
      throw new ForbiddenException('No employee profile is linked to this account.');
    }

    if (input.query.employeeId && input.query.employeeId !== employee.id) {
      throw new ForbiddenException('You cannot view another employee task calendar.');
    }

    const includeDaily = !input.query.source || input.query.source === 'DAILY_TASK';
    const includeProject =
      (!input.query.source || input.query.source === 'PROJECT_TASK') &&
      (await this.dailyTaskAuthz.resolveEffective(accessActor)).has('projects.read');

    let workflowStageId = input.query.workflowStageId;
    if (includeDaily && input.query.status && !workflowStageId) {
      if (UUID_RE.test(input.query.status)) {
        workflowStageId = input.query.status;
      } else {
        const stages = await this.dailyTasks.listWorkflowStages(input.organizationId);
        const match = stages.find((s) => s.stageKey === input.query.status);
        if (match) workflowStageId = match.id;
      }
    }

    const myQuery: MyDailyTasksQuery = {
      assignDateFrom: input.range.startDate,
      assignDateTo: input.range.endDate,
      search: input.query.search?.trim() || undefined,
      type: input.query.type,
      priority: input.query.priority,
      workflowStageId,
      page: 1,
      pageSize: 500,
      sortBy: 'assignDate',
      sortDir: 'asc',
    };

    const projectStatusParsed = projectTaskStatusSchema.safeParse(input.query.status);
    const projectTaskStatusFilter =
      includeProject && projectStatusParsed.success ? projectStatusParsed.data : undefined;

    const [myDaily, projectRows] = await Promise.all([
      includeDaily
        ? this.dailyTasks.listMyTasks(
            input.organizationId,
            input.adminId,
            myQuery,
            input.clientToday,
            noteAttach,
          )
        : Promise.resolve({ items: [] as const, total: 0, page: 1, pageSize: 0 }),
      includeProject
        ? this.data.listProjectTasksForCalendar(input.organizationId, {
            startDate: input.range.startDate,
            endDate: input.range.endDate,
            search: input.query.search,
            projectId: input.query.projectId,
            employeeId: employee.id,
            priority: input.query.projectTaskPriority,
            status: projectTaskStatusFilter,
          })
        : Promise.resolve([] as const),
    ]);

    let normalized: CalendarNormalizedTask[] = myDaily.items.map((t) =>
      fromDailyTaskListItem(t, input.clientToday),
    );
    if (includeProject) {
      normalized = normalized.concat(
        projectRows
          .map((t) => fromProjectTaskRow(t, input.clientToday))
          .filter((t): t is CalendarNormalizedTask => t !== null),
      );
    }

    if (input.query.displayStatus) {
      normalized = normalized.filter((t) => t.displayStatus === input.query.displayStatus);
    }

    return buildCalendarResponse(normalized, input.range);
  }
}
