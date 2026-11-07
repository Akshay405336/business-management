import { randomUUID } from 'node:crypto';
import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import type {
  DailyTaskListItem,
  DailyTaskNoteItem,
} from '../../../../domain/read-models/daily-task.models.js';
import { Prisma } from '../../../../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../../../../infrastructure/database/prisma.service.js';
import { DEFAULT_DAILY_TASK_WORKFLOW_STAGES } from '../../../../domain/constants/default-workflow-stages.js';
import {
  DailyTaskConflictError,
  DailyTaskNotFoundError,
  DailyTaskValidationError,
} from '../../../../domain/errors/daily-task.errors.js';
import { assertCreateDailyTaskBusinessRules } from '../../../../domain/policies/daily-task-create.policy.js';
import { assertDailyTaskNoteText, normalizeDailyTaskNoteText } from '../../../../domain/policies/daily-task-note-text.policy.js';
import { assertRescheduleChangesAssignDate } from '../../../../domain/policies/daily-task-reschedule.policy.js';
import { assertUpdateDailyTaskInput } from '../../../../domain/policies/daily-task-update.policy.js';
import { computeDailyTaskBoardMetrics } from '../../../../domain/services/daily-task-board-metrics.service.js';
import { parseIsoDateOnly } from '../../../../domain/value-objects/daily-task-date.js';
import {
  applyDailyTaskKanbanOrder,
  listDailyTaskIdsInStageForAssignDate,
  nextDailyTaskKanbanSortOrder,
  resolveKanbanInsertIndex,
  sameTaskIdOrder,
} from '../helpers/daily-task-kanban-order.js';
import { dateOnlyFromDb, toDailyTaskListItem } from '../mappers/daily-task-list-item.mapper.js';
import type {
  CreateDailyTaskInput,
  CreateDailyTaskNoteInput,
  DailyTaskBoardQuery,
  DailyTaskListQuery,
  MoveDailyTaskStageInput,
  MyDailyTasksQuery,
  RescheduleDailyTaskInput,
  TaskNoteAttachOptions,
  UpdateDailyTaskInput,
} from '../../../../domain/types/daily-task-inputs.js';

const parseDateOnly = parseIsoDateOnly;

/**
 * Prisma-backed persistence for Daily Tasks: transactions, queries, and DB-specific mapping hooks.
 * Implements the same operations as {@link DailyTaskRepository}; the Nest repository delegates here.
 */
export class DailyTaskPrismaStore {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultWorkflowStages(organizationId: string): Promise<void> {
    const count = await this.prisma.dailyTaskWorkflowStage.count({ where: { organizationId } });
    if (count > 0) return;
    await this.prisma.dailyTaskWorkflowStage.createMany({
      data: DEFAULT_DAILY_TASK_WORKFLOW_STAGES.map((stage) => ({
        id: randomUUID(),
        organizationId,
        ...stage,
      })),
    });
  }

  async listWorkflowStages(organizationId: string) {
    await this.ensureDefaultWorkflowStages(organizationId);
    return this.prisma.dailyTaskWorkflowStage.findMany({
      where: { organizationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async replaceWorkflowStages(
    organizationId: string,
    stages: readonly {
      id?: string;
      stageKey: string;
      name: string;
      sortOrder: number;
      colorToken: string;
      isActive: boolean;
      isCompletedStage: boolean;
    }[],
  ) {
    await this.ensureDefaultWorkflowStages(organizationId);
    const existing = await this.prisma.dailyTaskWorkflowStage.findMany({
      where: { organizationId },
      select: { id: true, stageKey: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));
    const incomingIds = new Set(stages.map((s) => s.id).filter(Boolean) as string[]);

    const removedStageIds = [...existingIds].filter((id) => !incomingIds.has(id));
    if (removedStageIds.length > 0) {
      const inUseByStage = await this.prisma.dailyTask.groupBy({
        by: ['workflowStageId'],
        where: { organizationId, workflowStageId: { in: removedStageIds } },
        _count: { _all: true },
      });
      if (inUseByStage.some((row) => row._count._all > 0)) {
        throw new DailyTaskConflictError(
          'Cannot remove a workflow stage that still has tasks assigned.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const stage of stages) {
        if (stage.id && existingIds.has(stage.id)) {
          await tx.dailyTaskWorkflowStage.update({
            where: { id: stage.id },
            data: {
              stageKey: stage.stageKey,
              name: stage.name,
              sortOrder: stage.sortOrder,
              colorToken: stage.colorToken,
              isActive: stage.isActive,
              isCompletedStage: stage.isCompletedStage,
            },
          });
        } else {
          await tx.dailyTaskWorkflowStage.create({
            data: {
              id: randomUUID(),
              organizationId,
              stageKey: stage.stageKey,
              name: stage.name,
              sortOrder: stage.sortOrder,
              colorToken: stage.colorToken,
              isActive: stage.isActive,
              isCompletedStage: stage.isCompletedStage,
            },
          });
        }
      }
    });

    return this.listWorkflowStages(organizationId);
  }

  private taskInclude() {
    return {
      workflowStage: true,
      projectPhase: true,
      project: { select: { id: true, name: true } },
      assignees: {
        include: {
          employee: {
            select: {
              id: true,
              displayName: true,
              jobTitle: true,
              profileImageStoredObjectId: true,
              profileImageUrl: true,
            },
          },
        },
      },
    } satisfies Prisma.DailyTaskInclude;
  }

  private buildWhere(
    organizationId: string,
    filters: {
      assignDate?: string;
      assignDateFrom?: string;
      assignDateTo?: string;
      calendarRangeStart?: string;
      calendarRangeEnd?: string;
      search?: string;
      type?: DailyTaskBoardQuery['type'];
      employeeId?: string;
      projectId?: string;
      priority?: DailyTaskBoardQuery['priority'];
      workflowStageId?: string;
      projectPhaseId?: string;
      category?: DailyTaskBoardQuery['category'];
      completedOnly?: boolean;
      overdueOnly?: boolean;
      clientToday?: string;
      employeeIdsForMyTasks?: readonly string[];
    },
  ): Prisma.DailyTaskWhereInput {
    const hasCalendarRange =
      Boolean(filters.calendarRangeStart) && Boolean(filters.calendarRangeEnd);
    const calendarStart = filters.calendarRangeStart
      ? parseDateOnly(filters.calendarRangeStart)
      : null;
    const calendarEnd = filters.calendarRangeEnd ? parseDateOnly(filters.calendarRangeEnd) : null;

    const where: Prisma.DailyTaskWhereInput = {
      organizationId,
      ...(filters.assignDate ? { assignDate: parseDateOnly(filters.assignDate) } : {}),
      ...(!hasCalendarRange && (filters.assignDateFrom || filters.assignDateTo)
        ? {
            assignDate: {
              ...(filters.assignDateFrom ? { gte: parseDateOnly(filters.assignDateFrom) } : {}),
              ...(filters.assignDateTo ? { lte: parseDateOnly(filters.assignDateTo) } : {}),
            },
          }
        : {}),
      ...(hasCalendarRange && calendarStart && calendarEnd
        ? {
            OR: [
              {
                AND: [
                  { assignDate: { lte: calendarEnd } },
                  {
                    OR: [
                      { dueDate: { gte: calendarStart } },
                      { dueDate: null },
                    ],
                  },
                ],
              },
            ],
          }
        : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.workflowStageId ? { workflowStageId: filters.workflowStageId } : {}),
      ...(filters.projectPhaseId ? { projectPhaseId: filters.projectPhaseId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.completedOnly ? { completedAt: { not: null } } : {}),
      ...(filters.search?.trim()
        ? {
            OR: [
              { title: { contains: filters.search.trim(), mode: 'insensitive' } },
              { description: { contains: filters.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filters.employeeId
        ? { assignees: { some: { employeeId: filters.employeeId } } }
        : {}),
      ...(filters.employeeIdsForMyTasks?.length
        ? { assignees: { some: { employeeId: { in: [...filters.employeeIdsForMyTasks] } } } }
        : {}),
    };

    if (filters.overdueOnly && filters.clientToday) {
      where.completedAt = null;
      const overdueClause: Prisma.DailyTaskWhereInput = {
        OR: [
          { assignDate: { lt: parseDateOnly(filters.clientToday) } },
          { dueDate: { lt: parseDateOnly(filters.clientToday) } },
        ],
      };
      const existingAnd = where.AND;
      where.AND = [
        ...(Array.isArray(existingAnd) ? existingAnd : existingAnd ? [existingAnd] : []),
        overdueClause,
      ];
    }

    return where;
  }

  async getBoard(
    organizationId: string,
    query: DailyTaskBoardQuery,
    clientToday?: string,
    noteAttach?: TaskNoteAttachOptions,
  ) {
    await this.ensureDefaultWorkflowStages(organizationId);
    const workflowStages = await this.listWorkflowStages(organizationId);
    const activeStages = workflowStages.filter((stage) => stage.isActive);
    const fallbackStageId =
      activeStages.find((stage) => stage.stageKey === 'todo')?.id ?? activeStages[0]?.id ?? null;

    const mappedWorkflowStages = activeStages.map((stage) => ({
      id: stage.id,
      stageKey: stage.stageKey,
      name: stage.name,
      sortOrder: stage.sortOrder,
      colorToken: stage.colorToken,
      isActive: stage.isActive,
      isCompletedStage: stage.isCompletedStage,
    }));

    const rows = await this.prisma.dailyTask.findMany({
      where: this.buildWhere(organizationId, { ...query, assignDate: query.assignDate }),
      include: this.taskInclude(),
      orderBy: [{ kanbanSortOrder: 'asc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    });

    let items: DailyTaskListItem[] = rows.map((row) => toDailyTaskListItem(row, clientToday));
    items = [...(await this.attachLatestEmployeeNotes(organizationId, items))];
    if (noteAttach) {
      items = [...(await this.attachTaskNoteSummaries(organizationId, items, noteAttach))];
    }
    const columnForTask = (item: DailyTaskListItem) =>
      item.workflowStageId ?? fallbackStageId;

    const columns = activeStages.map((stage) => ({
      stage: {
        id: stage.id,
        name: stage.name,
        sortOrder: stage.sortOrder,
        colorToken: stage.colorToken,
        columnKind: 'daily' as const,
        stageKey: stage.stageKey,
        isCompletedStage: stage.isCompletedStage,
      },
      tasks: items.filter((item) => columnForTask(item) === stage.id),
    }));

    return {
      assignDate: query.assignDate,
      boardMode: 'daily' as const,
      projectId: query.projectId ?? null,
      projectName: null,
      stages: mappedWorkflowStages,
      columns,
      projectBoards: [],
      projectTasksOverview: [],
      metrics: computeDailyTaskBoardMetrics(items),
    };
  }

  async listTasks(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday?: string,
    employeeIdsForMyTasks?: readonly string[],
    noteAttach?: TaskNoteAttachOptions,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.buildWhere(organizationId, {
      ...query,
      clientToday,
      employeeIdsForMyTasks,
    });
    const orderBy: Prisma.DailyTaskOrderByWithRelationInput =
      query.sortBy === 'dueDate'
        ? { dueDate: query.sortDir ?? 'asc' }
        : query.sortBy === 'priority'
          ? { priority: query.sortDir ?? 'desc' }
          : query.sortBy === 'title'
            ? { title: query.sortDir ?? 'asc' }
            : query.sortBy === 'updatedAt'
              ? { updatedAt: query.sortDir ?? 'desc' }
              : { assignDate: query.sortDir ?? 'desc' };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.dailyTask.count({ where }),
      this.prisma.dailyTask.findMany({
        where,
        include: this.taskInclude(),
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let items: DailyTaskListItem[] = rows.map((row) => toDailyTaskListItem(row, clientToday));
    items = [...(await this.attachLatestEmployeeNotes(organizationId, items))];
    if (noteAttach) {
      items = [...(await this.attachTaskNoteSummaries(organizationId, items, noteAttach))];
    }
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async assertEmployeesEligible(organizationId: string, employeeIds: readonly string[]) {
    const rows = await this.prisma.employee.findMany({
      where: {
        organizationId,
        id: { in: [...employeeIds] },
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
      },
      select: { id: true },
    });
    if (rows.length !== employeeIds.length) {
      throw new DailyTaskValidationError('Select eligible active employees.');
    }
  }

  async assertProjectAccessible(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) throw new DailyTaskValidationError('Select a valid project.');
  }

  async assertProjectPhaseForProject(
    organizationId: string,
    projectId: string,
    projectPhaseId: string,
  ) {
    const phase = await this.prisma.projectPhase.findFirst({
      where: { id: projectPhaseId, projectId, organizationId },
      select: { id: true, status: true },
    });
    if (!phase) {
      throw new DailyTaskValidationError('Select a project stage that belongs to the chosen project.');
    }
    return phase;
  }

  async createTask(organizationId: string, adminId: string, input: CreateDailyTaskInput) {
    assertCreateDailyTaskBusinessRules(input);
    await this.assertEmployeesEligible(organizationId, input.employeeIds);

    let workflowStageId: string | null = null;
    let projectPhaseId: string | null = null;
    let markCompleted = false;

    if (input.type === 'GENERAL') {
      const stage = await this.prisma.dailyTaskWorkflowStage.findFirst({
        where: { id: input.workflowStageId, organizationId, isActive: true },
      });
      if (!stage) throw new DailyTaskValidationError('Select a valid workflow stage.');
      workflowStageId = stage.id;
      markCompleted = stage.isCompletedStage;
    } else {
      const projectId = input.projectId!;
      await this.assertProjectAccessible(organizationId, projectId);
      const [phase, workflowStage] = await Promise.all([
        this.assertProjectPhaseForProject(organizationId, projectId, input.projectPhaseId!),
        this.prisma.dailyTaskWorkflowStage.findFirst({
          where: { id: input.workflowStageId, organizationId, isActive: true },
        }),
      ]);
      projectPhaseId = phase.id;
      if (!workflowStage) throw new DailyTaskValidationError('Select a valid daily workflow status.');
      workflowStageId = workflowStage.id;
      markCompleted = workflowStage.isCompletedStage;
    }

    const taskId = randomUUID();
    const assignDate = parseDateOnly(input.assignDate);
    const row = await this.prisma.$transaction(async (tx) => {
      const kanbanSortOrder =
        workflowStageId !== null
          ? await nextDailyTaskKanbanSortOrder(tx, organizationId, workflowStageId, assignDate)
          : 0;
      await tx.dailyTask.create({
        data: {
          id: taskId,
          organizationId,
          type: input.type,
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          category: input.category ?? null,
          workflowStageId,
          projectPhaseId,
          priority: input.priority ?? 'MEDIUM',
          assignDate,
          kanbanSortOrder,
          dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
          startTimeMinutes: input.startTimeMinutes ?? null,
          dueTimeMinutes: input.dueTimeMinutes ?? null,
          estimatedHours: input.estimatedHours ?? null,
          projectId: input.type === 'PROJECT' ? input.projectId ?? null : null,
          linkedProjectTaskId: input.linkedProjectTaskId ?? null,
          instructions: input.instructions?.trim() ?? '',
          referenceUrl: input.referenceUrl ?? null,
          completedAt: markCompleted ? new Date() : null,
          completedByAdminId: markCompleted ? adminId : null,
          createdByAdminId: adminId,
        },
        include: this.taskInclude(),
      });

      await tx.dailyTaskAssignee.createMany({
        data: input.employeeIds.map((employeeId) => ({
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          employeeId,
        })),
      });

      await tx.dailyTaskActivity.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          actorAdminId: adminId,
          eventType: 'CREATED',
          metadata: { assignDate: input.assignDate, type: input.type },
        },
      });

      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return toDailyTaskListItem(row);
  }

  async getTask(organizationId: string, taskId: string, clientToday?: string) {
    const row = await this.prisma.dailyTask.findFirst({
      where: { id: taskId, organizationId },
      include: this.taskInclude(),
    });
    if (!row) throw new DailyTaskNotFoundError();
    const [item] = await this.attachLatestEmployeeNotes(organizationId, [
      toDailyTaskListItem(row, clientToday),
    ]);
    return item!;
  }

  async updateTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: UpdateDailyTaskInput,
  ) {
    const existing = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!existing) throw new DailyTaskNotFoundError();

    assertUpdateDailyTaskInput(
      { assignDate: existing.assignDate, dueDate: existing.dueDate },
      input,
    );

    if (input.employeeIds) {
      await this.assertEmployeesEligible(organizationId, input.employeeIds);
    }
    if (input.projectId) await this.assertProjectAccessible(organizationId, input.projectId);

    let projectPhaseId: string | undefined;
    if (input.projectPhaseId !== undefined && input.projectPhaseId !== null) {
      const projectId = input.projectId ?? existing.projectId;
      if (!projectId) throw new DailyTaskValidationError('Project task is missing a project reference.');
      const phase = await this.assertProjectPhaseForProject(
        organizationId,
        projectId,
        input.projectPhaseId,
      );
      projectPhaseId = phase.id;
    } else if (input.projectPhaseId === null) {
      projectPhaseId = undefined;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.dailyTask.update({
        where: { id: taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.workflowStageId !== undefined ? { workflowStageId: input.workflowStageId } : {}),
          ...(input.projectPhaseId !== undefined
            ? { projectPhaseId: input.projectPhaseId === null ? null : projectPhaseId }
            : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.assignDate !== undefined ? { assignDate: parseDateOnly(input.assignDate) } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null }
            : {}),
          ...(input.startTimeMinutes !== undefined ? { startTimeMinutes: input.startTimeMinutes } : {}),
          ...(input.dueTimeMinutes !== undefined ? { dueTimeMinutes: input.dueTimeMinutes } : {}),
          ...(input.estimatedHours !== undefined ? { estimatedHours: input.estimatedHours } : {}),
          ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
          ...(input.linkedProjectTaskId !== undefined
            ? { linkedProjectTaskId: input.linkedProjectTaskId }
            : {}),
          ...(input.instructions !== undefined ? { instructions: input.instructions.trim() } : {}),
          ...(input.referenceUrl !== undefined ? { referenceUrl: input.referenceUrl } : {}),
        },
      });

      if (input.employeeIds) {
        await tx.dailyTaskAssignee.deleteMany({ where: { dailyTaskId: taskId } });
        await tx.dailyTaskAssignee.createMany({
          data: input.employeeIds.map((employeeId) => ({
            id: randomUUID(),
            organizationId,
            dailyTaskId: taskId,
            employeeId,
          })),
        });
        await tx.dailyTaskActivity.create({
          data: {
            id: randomUUID(),
            organizationId,
            dailyTaskId: taskId,
            actorAdminId: adminId,
            eventType: 'ASSIGNEES_CHANGED',
          },
        });
      }

      await tx.dailyTaskActivity.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          actorAdminId: adminId,
          eventType: 'UPDATED',
        },
      });

      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return toDailyTaskListItem(row);
  }

  async moveTaskStage(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: MoveDailyTaskStageInput,
  ) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();
    if (!task.workflowStageId && !input.workflowStageId) {
      throw new DailyTaskValidationError('Select a valid daily workflow status.');
    }

    const stage = await this.prisma.dailyTaskWorkflowStage.findFirst({
      where: { id: input.workflowStageId, organizationId, isActive: true },
    });
    if (!stage) throw new DailyTaskValidationError('Select a valid daily workflow status.');

    const assignDate = task.assignDate;
    const sourceStageId = task.workflowStageId;
    const destinationStageId = stage.id;
    const stageChanged = sourceStageId !== destinationStageId;

    const destinationTaskIds = await listDailyTaskIdsInStageForAssignDate(
      this.prisma,
      organizationId,
      destinationStageId,
      assignDate,
    );
    if (input.beforeTaskId) {
      const beforeTask = await this.prisma.dailyTask.findFirst({
        where: {
          id: input.beforeTaskId,
          organizationId,
          workflowStageId: destinationStageId,
          assignDate,
        },
        select: { id: true },
      });
      if (!beforeTask) {
        throw new DailyTaskValidationError('Invalid drop position for this workflow column.');
      }
    }

    const withoutActive = destinationTaskIds.filter((id) => id !== taskId);
    const insertIndex = resolveKanbanInsertIndex(withoutActive, input.beforeTaskId);
    const nextDestinationIds = [...withoutActive];
    nextDestinationIds.splice(insertIndex, 0, taskId);

    const priorDestinationIds = destinationTaskIds;
    if (!stageChanged && sameTaskIdOrder(priorDestinationIds, nextDestinationIds)) {
      const unchangedRow = await this.prisma.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
      return toDailyTaskListItem(unchangedRow);
    }

    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    const row = await this.prisma.$transaction(async (tx) => {
      if (stageChanged && sourceStageId) {
        const sourceIds = (
          await listDailyTaskIdsInStageForAssignDate(
            tx,
            organizationId,
            sourceStageId,
            assignDate,
          )
        ).filter((id) => id !== taskId);
        await applyDailyTaskKanbanOrder(tx, organizationId, sourceStageId, assignDate, sourceIds);
      }

      await tx.dailyTask.update({
        where: { id: taskId },
        data: {
          workflowStageId: stage.id,
          completedAt: stage.isCompletedStage ? new Date() : null,
          completedByAdminId: stage.isCompletedStage ? adminId : null,
        },
      });

      await applyDailyTaskKanbanOrder(
        tx,
        organizationId,
        destinationStageId,
        assignDate,
        nextDestinationIds,
      );

      if (employeeIds.length > 0) {
        const now = new Date();
        if (stage.stageKey === 'in_progress') {
          await tx.dailyTaskAssignee.updateMany({
            where: { dailyTaskId: taskId, employeeId: { in: employeeIds }, startedAt: null },
            data: { startedAt: now },
          });
        }
        if (stage.isCompletedStage) {
          await tx.dailyTaskAssignee.updateMany({
            where: { dailyTaskId: taskId, employeeId: { in: employeeIds } },
            data: { completedAt: now },
          });
        }
      }

      const eventType = stageChanged
        ? stage.isCompletedStage
          ? 'COMPLETED'
          : 'STAGE_CHANGED'
        : 'UPDATED';
      await tx.dailyTaskActivity.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          actorAdminId: adminId,
          eventType,
          metadata: {
            workflowStageId: stage.id,
            stageKey: stage.stageKey,
            beforeTaskId: input.beforeTaskId ?? null,
            reorderedOnly: !stageChanged,
          },
        },
      });
      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return toDailyTaskListItem(row);
  }

  async rescheduleTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: RescheduleDailyTaskInput,
  ) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();
    assertRescheduleChangesAssignDate(task.assignDate, input.assignDate);
    const fromAssignDate = task.assignDate;
    const toAssignDate = parseDateOnly(input.assignDate);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.dailyTask.update({
        where: { id: taskId },
        data: { assignDate: toAssignDate },
      });
      await tx.dailyTaskReschedule.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          fromAssignDate,
          toAssignDate,
          rescheduledByAdminId: adminId,
          note: input.note?.trim() ?? '',
        },
      });
      await tx.dailyTaskActivity.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          actorAdminId: adminId,
          eventType: 'RESCHEDULED',
          metadata: {
            fromAssignDate: dateOnlyFromDb(fromAssignDate),
            toAssignDate: input.assignDate,
          },
        },
      });
      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return toDailyTaskListItem(row);
  }

  async deleteTask(organizationId: string, taskId: string) {
    const existing = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!existing) throw new DailyTaskNotFoundError();
    await this.prisma.dailyTask.delete({ where: { id: taskId } });
  }

  async findEmployeeIdsForAdmin(organizationId: string, adminId: string): Promise<string[]> {
    const rows = await this.prisma.employee.findMany({
      where: { organizationId, platformAdminId: adminId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async listMyTasks(
    organizationId: string,
    adminId: string,
    query: MyDailyTasksQuery,
    clientToday: string,
    noteAttach?: TaskNoteAttachOptions,
  ) {
    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    if (employeeIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const scope = query.scope ?? 'today';
    let assignDateFrom: string | undefined;
    let assignDateTo: string | undefined;
    let assignDate: string | undefined;
    let completedOnly: boolean | undefined;
    let overdueOnly: boolean | undefined;

    if (query.assignDateFrom && query.assignDateTo) {
      assignDateFrom = query.assignDateFrom;
      assignDateTo = query.assignDateTo;
    } else if (query.assignDate) {
      assignDate = query.assignDate;
    } else if (scope === 'today') {
      assignDate = clientToday;
    } else if (scope === 'upcoming') {
      assignDateFrom = clientToday;
    } else if (scope === 'completed') {
      completedOnly = true;
    } else if (scope === 'overdue') {
      overdueOnly = true;
    }

    return this.listTasks(
      organizationId,
      {
        page,
        pageSize,
        assignDate,
        assignDateFrom,
        assignDateTo,
        completedOnly,
        overdueOnly,
        search: query.search,
        type: query.type,
        priority: query.priority,
        workflowStageId: query.workflowStageId,
        projectId: query.projectId,
        sortBy: query.sortBy ?? (assignDate || assignDateFrom ? 'priority' : 'assignDate'),
        sortDir: query.sortDir ?? (assignDate || assignDateFrom ? 'desc' : 'asc'),
      },
      clientToday,
      employeeIds,
      noteAttach,
    );
  }

  async isTaskAssignedToAdmin(
    organizationId: string,
    adminId: string,
    taskId: string,
  ): Promise<boolean> {
    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    if (employeeIds.length === 0) return false;
    const count = await this.prisma.dailyTaskAssignee.count({
      where: {
        organizationId,
        dailyTaskId: taskId,
        employeeId: { in: employeeIds },
      },
    });
    return count > 0;
  }

  async listTaskActivities(organizationId: string, taskId: string) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) throw new DailyTaskNotFoundError();

    const rows = await this.prisma.dailyTaskActivity.findMany({
      where: { organizationId, dailyTaskId: taskId },
      orderBy: { occurredAt: 'asc' },
      include: {
        actor: { select: { id: true, displayName: true } },
      },
    });

    const employeeByAdmin = await this.loadEmployeeIdsByAdminIds(
      organizationId,
      rows.map((row) => row.actorAdminId),
    );

    return rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      occurredAt: row.occurredAt.toISOString(),
      actorAdminId: row.actorAdminId,
      actorDisplayName: row.actor.displayName,
      actorEmployeeId: employeeByAdmin.get(row.actorAdminId) ?? null,
      metadata: row.metadata as Record<string, unknown> | null,
    }));
  }

  async addTaskComment(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: { text: string; scope: 'admin' | 'employee' },
  ) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();

    const trimmed = normalizeDailyTaskNoteText(input.text);
    assertDailyTaskNoteText(trimmed);

    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    const authorEmployeeId =
      input.scope === 'employee' && employeeIds.length === 1 ? employeeIds[0]! : null;

    await this.prisma.dailyTaskActivity.create({
      data: {
        id: randomUUID(),
        organizationId,
        dailyTaskId: taskId,
        actorAdminId: adminId,
        eventType: 'COMMENT_ADDED',
        metadata: {
          text: trimmed,
          scope: input.scope,
          authorEmployeeId,
        },
      },
    });

    return this.getTask(organizationId, taskId);
  }

  async attachLatestEmployeeNotes(
    organizationId: string,
    items: readonly DailyTaskListItem[],
  ): Promise<DailyTaskListItem[]> {
    if (items.length === 0) return [...items];
    const taskIds = items.map((item) => item.id);
    const rows = await this.prisma.dailyTaskActivity.findMany({
      where: {
        organizationId,
        dailyTaskId: { in: taskIds },
        eventType: 'COMMENT_ADDED',
      },
      orderBy: { occurredAt: 'desc' },
      include: { actor: { select: { displayName: true } } },
    });

    const latestByTask = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const meta = row.metadata as { scope?: string; text?: string } | null;
      if (meta?.scope === 'admin') continue;
      if (!latestByTask.has(row.dailyTaskId)) latestByTask.set(row.dailyTaskId, row);
    }

    return items.map((item) => {
      const row = latestByTask.get(item.id);
      if (!row) return item;
      const meta = row.metadata as {
        text?: string;
        scope?: 'employee' | 'admin';
        authorEmployeeId?: string | null;
      };
      return {
        ...item,
        latestEmployeeNote: {
          text: meta.text ?? '',
          authorName: row.actor.displayName,
          authorEmployeeId: meta.authorEmployeeId ?? null,
          occurredAt: row.occurredAt.toISOString(),
          scope: meta.scope === 'admin' ? 'admin' : 'employee',
        },
      };
    });
  }

  private noteInclude() {
    return {
      employee: {
        select: {
          id: true,
          displayName: true,
          profileImageUrl: true,
          profileImageStoredObjectId: true,
        },
      },
      acknowledgedBy: { select: { id: true, displayName: true } },
    } as const;
  }

  private mapNoteRow(
    row: {
      id: string;
      dailyTaskId: string;
      employeeId: string | null;
      historicalDisplayName: string;
      authorAdminId: string;
      text: string;
      acknowledgementStatus: 'UNREAD' | 'ACKNOWLEDGED';
      acknowledgedByAdminId: string | null;
      acknowledgedAt: Date | null;
      createdAt: Date;
      employee: {
        displayName: string;
        profileImageUrl: string | null;
        profileImageStoredObjectId: string | null;
      } | null;
      acknowledgedBy: { displayName: string } | null;
    },
  ): DailyTaskNoteItem {
    return {
      id: row.id,
      dailyTaskId: row.dailyTaskId,
      employeeId: row.employeeId ?? '',
      employeeDisplayName: row.employee?.displayName || row.historicalDisplayName || 'Former employee',
      employeeProfileImageUrl: row.employee?.profileImageStoredObjectId
        ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(row.employee.profileImageStoredObjectId)
        : (row.employee?.profileImageUrl ?? null),
      authorAdminId: row.authorAdminId,
      text: row.text,
      acknowledgementStatus: row.acknowledgementStatus,
      acknowledgedByAdminId: row.acknowledgedByAdminId,
      acknowledgedByDisplayName: row.acknowledgedBy?.displayName ?? null,
      acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async attachTaskNoteSummaries(
    organizationId: string,
    items: readonly DailyTaskListItem[],
    attach: TaskNoteAttachOptions,
  ): Promise<DailyTaskListItem[]> {
    if (items.length === 0) return [...items];
    const taskIds = items.map((item) => item.id);

    const orgSummaryByTask = new Map<
      string,
      { unreadCount: number; totalCount: number; latest: DailyTaskNoteItem | null }
    >();
    if (attach.includeOrgUnread) {
      const rows = await this.prisma.dailyTaskNote.findMany({
        where: {
          organizationId,
          dailyTaskId: { in: taskIds },
        },
        orderBy: { createdAt: 'desc' },
        include: this.noteInclude(),
      });
      const latestByTask = new Map<string, DailyTaskNoteItem>();
      const unreadByTask = new Map<string, number>();
      const totalByTask = new Map<string, number>();
      for (const row of rows) {
        totalByTask.set(row.dailyTaskId, (totalByTask.get(row.dailyTaskId) ?? 0) + 1);
        if (!latestByTask.has(row.dailyTaskId)) {
          latestByTask.set(row.dailyTaskId, this.mapNoteRow(row));
        }
        if (row.acknowledgementStatus === 'UNREAD') {
          unreadByTask.set(row.dailyTaskId, (unreadByTask.get(row.dailyTaskId) ?? 0) + 1);
        }
      }
      for (const taskId of taskIds) {
        const totalCount = totalByTask.get(taskId) ?? 0;
        if (totalCount === 0) continue;
        orgSummaryByTask.set(taskId, {
          unreadCount: unreadByTask.get(taskId) ?? 0,
          totalCount,
          latest: latestByTask.get(taskId) ?? null,
        });
      }
    }

    const ownSummaryByTask = new Map<
      string,
      { unreadCount: number; totalCount: number; latest: DailyTaskNoteItem | null }
    >();
    if (attach.includeOwnSummary) {
      const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, attach.adminId);
      if (employeeIds.length > 0) {
        const rows = await this.prisma.dailyTaskNote.findMany({
          where: {
            organizationId,
            dailyTaskId: { in: taskIds },
            employeeId: { in: employeeIds },
          },
          orderBy: { createdAt: 'desc' },
          include: this.noteInclude(),
        });
        const latestByTask = new Map<string, DailyTaskNoteItem>();
        const unreadOwnByTask = new Map<string, number>();
        const totalOwnByTask = new Map<string, number>();
        for (const row of rows) {
          totalOwnByTask.set(row.dailyTaskId, (totalOwnByTask.get(row.dailyTaskId) ?? 0) + 1);
          if (!latestByTask.has(row.dailyTaskId)) {
            latestByTask.set(row.dailyTaskId, this.mapNoteRow(row));
          }
          if (row.acknowledgementStatus === 'UNREAD') {
            unreadOwnByTask.set(
              row.dailyTaskId,
              (unreadOwnByTask.get(row.dailyTaskId) ?? 0) + 1,
            );
          }
        }
        for (const taskId of taskIds) {
          const latest = latestByTask.get(taskId) ?? null;
          const unreadCount = unreadOwnByTask.get(taskId) ?? 0;
          const totalCount = totalOwnByTask.get(taskId) ?? 0;
          if (totalCount > 0) {
            ownSummaryByTask.set(taskId, { unreadCount, totalCount, latest });
          }
        }
      }
    }

    return items.map((item) => {
      const orgSummary = attach.includeOrgUnread ? (orgSummaryByTask.get(item.id) ?? null) : item.orgTaskNotes;
      return {
        ...item,
        unreadEmployeeNoteCount: orgSummary?.unreadCount ?? item.unreadEmployeeNoteCount,
        orgTaskNotes: orgSummary,
        myTaskNotes: attach.includeOwnSummary
          ? (ownSummaryByTask.get(item.id) ?? null)
          : item.myTaskNotes,
      };
    });
  }

  async createTaskNote(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: CreateDailyTaskNoteInput,
  ): Promise<DailyTaskNoteItem> {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();

    const trimmed = normalizeDailyTaskNoteText(input.text);
    assertDailyTaskNoteText(trimmed);

    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    const assignment = await this.prisma.dailyTaskAssignee.findFirst({
      where: {
        organizationId,
        dailyTaskId: taskId,
        employeeId: { in: employeeIds },
      },
      select: { employeeId: true },
    });
    if (!assignment?.employeeId) {
      throw new DailyTaskValidationError('You can only add notes to tasks assigned to you.');
    }

    const row = await this.prisma.dailyTaskNote.create({
      data: {
        id: randomUUID(),
        organizationId,
        dailyTaskId: taskId,
        employeeId: assignment.employeeId,
        authorAdminId: adminId,
        text: trimmed,
        acknowledgementStatus: 'UNREAD',
      },
      include: this.noteInclude(),
    });

    return this.mapNoteRow(row);
  }

  async listTaskNotes(
    organizationId: string,
    adminId: string,
    taskId: string,
    viewAll: boolean,
  ): Promise<readonly DailyTaskNoteItem[]> {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();

    const employeeIds = viewAll
      ? null
      : await this.findEmployeeIdsForAdmin(organizationId, adminId);

    const rows = await this.prisma.dailyTaskNote.findMany({
      where: {
        organizationId,
        dailyTaskId: taskId,
        ...(employeeIds ? { employeeId: { in: employeeIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: this.noteInclude(),
    });

    return rows.map((row) => this.mapNoteRow(row));
  }

  async acknowledgeTaskNote(
    organizationId: string,
    adminId: string,
    taskId: string,
    noteId: string,
  ): Promise<DailyTaskNoteItem> {
    const existing = await this.prisma.dailyTaskNote.findFirst({
      where: { id: noteId, organizationId, dailyTaskId: taskId },
      include: this.noteInclude(),
    });
    if (!existing) throw new DailyTaskNotFoundError();

    if (existing.acknowledgementStatus === 'ACKNOWLEDGED') {
      return this.mapNoteRow(existing);
    }

    const row = await this.prisma.dailyTaskNote.update({
      where: { id: noteId },
      data: {
        acknowledgementStatus: 'ACKNOWLEDGED',
        acknowledgedByAdminId: adminId,
        acknowledgedAt: new Date(),
      },
      include: this.noteInclude(),
    });

    return this.mapNoteRow(row);
  }

  private async loadEmployeeIdsByAdminIds(
    organizationId: string,
    adminIds: readonly string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(adminIds)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.employee.findMany({
      where: { organizationId, platformAdminId: { in: unique } },
      select: { id: true, platformAdminId: true },
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.platformAdminId) map.set(row.platformAdminId, row.id);
    }
    return map;
  }
}
