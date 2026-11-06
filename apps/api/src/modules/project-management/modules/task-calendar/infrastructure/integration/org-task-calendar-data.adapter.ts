import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { DailyTaskListItem } from '@techwin/contracts';
import { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../infrastructure/database/prisma.service.js';
import {
  DAILY_TASK_REPOSITORY,
  type DailyTaskRepository,
} from '../../../daily-tasks/domain/repositories/daily-task.repository.js';
import type { DailyTaskListQuery, TaskNoteAttachOptions } from '../../../daily-tasks/domain/types/daily-task-inputs.js';
import type {
  ListProjectTasksForCalendarFilters,
  OrgTaskCalendarDataPort,
  TaskCalendarProjectTaskRow,
} from '../../application/integration/org-task-calendar-data.port.js';
import { normalizeListPage, normalizeListPageSize } from '../../../../shared/application/list-page.js';

const parseDateOnly = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const projectTaskCalendarInclude = {
  project: { select: { id: true, name: true, projectNumber: true } },
  assignee: {
    select: {
      id: true,
      displayName: true,
      email: true,
      employeeProfile: {
        select: {
          id: true,
          displayName: true,
          profileImageUrl: true,
          profileImageStoredObjectId: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectTaskInclude;

type ProjectTaskCalendarRow = Prisma.ProjectTaskGetPayload<{ include: typeof projectTaskCalendarInclude }>;

@Injectable()
export class OrgTaskCalendarDataAdapter implements OrgTaskCalendarDataPort {
  constructor(
    @Inject(DAILY_TASK_REPOSITORY) private readonly dailyTasks: DailyTaskRepository,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async listDailyTasksInRange(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday: string,
    noteAttach?: TaskNoteAttachOptions,
  ): Promise<readonly DailyTaskListItem[]> {
    const pageSize = normalizeListPageSize(query.pageSize, 100);
    let page = normalizeListPage(query.page);
    const items: DailyTaskListItem[] = [];
    let total = 0;
    while (true) {
      const res = await this.dailyTasks.listTasks(
        organizationId,
        { ...query, page, pageSize },
        clientToday,
        undefined,
        noteAttach,
      );
      total = res.total;
      items.push(...res.items);
      if (items.length >= total || res.items.length === 0) break;
      page += 1;
    }
    return items;
  }

  async listProjectTasksForCalendar(
    organizationId: string,
    filters: ListProjectTasksForCalendarFilters,
  ): Promise<readonly TaskCalendarProjectTaskRow[]> {
    const rangeStart = parseDateOnly(filters.startDate);
    const rangeEnd = parseDateOnly(filters.endDate);

    const dateOverlap: Prisma.ProjectTaskWhereInput = {
      OR: [
        {
          AND: [
            { startDate: { lte: rangeEnd } },
            { OR: [{ dueDate: { gte: rangeStart } }, { dueDate: null }] },
          ],
        },
        {
          AND: [{ startDate: null }, { dueDate: { not: null } }, { dueDate: { gte: rangeStart } }, { dueDate: { lte: rangeEnd } }],
        },
      ],
    };

    const where: Prisma.ProjectTaskWhereInput = {
      organizationId,
      AND: [
        dateOverlap,
        { OR: [{ startDate: { not: null } }, { dueDate: { not: null } }] },
        ...(filters.projectId ? [{ projectId: filters.projectId } as const] : []),
        ...(filters.priority ? [{ priority: filters.priority } as const] : []),
        ...(filters.status ? [{ status: filters.status } as const] : []),
        ...(filters.search?.trim()
          ? [
              {
                title: { contains: filters.search.trim(), mode: 'insensitive' as const },
              },
            ]
          : []),
        ...(filters.employeeId
          ? [
              {
                assignee: {
                  is: {
                    employeeProfile: {
                      id: filters.employeeId,
                      organizationId,
                    },
                  },
                },
              },
            ]
          : []),
      ],
    };

    const rows: ProjectTaskCalendarRow[] = await this.prisma.projectTask.findMany({
      where,
      include: projectTaskCalendarInclude,
      orderBy: [{ updatedAt: 'desc' }],
    });

    return rows.map((row) => {
      const emp = row.assignee?.employeeProfile ?? null;
      return {
        id: row.id,
        projectId: row.projectId,
        projectName: row.project.name,
        projectNumber: row.project.projectNumber,
        phaseId: row.phaseId,
        title: row.title,
        description: row.description,
        priority: row.priority,
        status: row.status,
        startDate: row.startDate ? dateOnly(row.startDate) : null,
        dueDate: row.dueDate ? dateOnly(row.dueDate) : null,
        actualCompletedAt: row.actualCompletedAt?.toISOString() ?? null,
        assigneeAdminId: row.assigneeAdminId,
        assignee: row.assignee
          ? { id: row.assignee.id, displayName: row.assignee.displayName, email: row.assignee.email }
          : null,
        assigneeEmployee: emp
          ? {
              id: emp.id,
              displayName: emp.displayName,
              profileImageUrl: emp.profileImageStoredObjectId
                ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(emp.profileImageStoredObjectId)
                : emp.profileImageUrl,
              profileImageStoredObjectId: emp.profileImageStoredObjectId,
            }
          : null,
      };
    });
  }
}
