import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EMPLOYEE_ROUTES, type DailyTaskListItem } from '@techwin/contracts';
import type {
  CreateDailyTaskRequest,
  DailyTaskBoardQuery,
  DailyTaskListQuery,
  MoveDailyTaskStageRequest,
  MyDailyTasksQuery,
  RescheduleDailyTaskRequest,
  UpdateDailyTaskRequest,
} from '@techwin/validation';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { DEFAULT_DAILY_TASK_WORKFLOW_STAGES } from '../../domain/constants/default-workflow-stages.js';
import {
  DailyTaskConflictError,
  DailyTaskNotFoundError,
  DailyTaskValidationError,
} from '../../domain/errors/daily-task.errors.js';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

type TaskRow = Prisma.DailyTaskGetPayload<{
  include: {
    workflowStage: true;
    projectPhase: true;
    project: { select: { id: true; name: true } };
    assignees: {
      include: {
        employee: {
          select: {
            id: true;
            displayName: true;
            jobTitle: true;
            profileImageStoredObjectId: true;
            profileImageUrl: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class PrismaDailyTaskRepository {
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

    for (const removedId of existingIds) {
      if (!incomingIds.has(removedId)) {
        const inUse = await this.prisma.dailyTask.count({
          where: { organizationId, workflowStageId: removedId },
        });
        if (inUse > 0) {
          throw new DailyTaskConflictError(
            'Cannot remove a workflow stage that still has tasks assigned.',
          );
        }
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

  private toListItem(row: TaskRow, clientToday?: string) {
    const assignDate = dateOnly(row.assignDate);
    const completed = Boolean(row.completedAt);
    const isOverdue = Boolean(
      !completed &&
        ((clientToday && assignDate < clientToday) ||
          (row.dueDate && dateOnly(row.dueDate) < (clientToday ?? assignDate))),
    );

    const stageKind = 'daily' as const;
    const stageName = row.workflowStage?.name ?? 'Unassigned';

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      category: row.category,
      workflowStageId: row.workflowStageId,
      workflowStageKey: row.workflowStage?.stageKey ?? null,
      workflowStageName: row.workflowStage?.name ?? null,
      projectPhaseId: row.projectPhaseId,
      projectPhaseName: row.projectPhase?.name ?? null,
      stageKind,
      stageName,
      priority: row.priority,
      assignDate,
      dueDate: row.dueDate ? dateOnly(row.dueDate) : null,
      startTimeMinutes: row.startTimeMinutes,
      dueTimeMinutes: row.dueTimeMinutes,
      estimatedHours: row.estimatedHours ? Number(row.estimatedHours) : null,
      projectId: row.projectId,
      projectName: row.project?.name ?? null,
      linkedProjectTaskId: row.linkedProjectTaskId,
      instructions: row.instructions,
      referenceUrl: row.referenceUrl,
      completedAt: row.completedAt?.toISOString() ?? null,
      isOverdue,
      assignees: row.assignees.map((assignee) => ({
        id: assignee.id,
        employeeId: assignee.employeeId,
        displayName: assignee.employee.displayName,
        jobTitle: assignee.employee.jobTitle,
        profileImageUrl: assignee.employee.profileImageStoredObjectId
          ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(
              assignee.employee.profileImageStoredObjectId,
            )
          : assignee.employee.profileImageUrl,
        startedAt: assignee.startedAt?.toISOString() ?? null,
        completedAt: assignee.completedAt?.toISOString() ?? null,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
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
    const where: Prisma.DailyTaskWhereInput = {
      organizationId,
      ...(filters.assignDate ? { assignDate: parseDateOnly(filters.assignDate) } : {}),
      ...(filters.assignDateFrom || filters.assignDateTo
        ? {
            assignDate: {
              ...(filters.assignDateFrom ? { gte: parseDateOnly(filters.assignDateFrom) } : {}),
              ...(filters.assignDateTo ? { lte: parseDateOnly(filters.assignDateTo) } : {}),
            },
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
      where.OR = [
        { assignDate: { lt: parseDateOnly(filters.clientToday) } },
        { dueDate: { lt: parseDateOnly(filters.clientToday) } },
      ];
    }

    return where;
  }

  async getBoard(organizationId: string, query: DailyTaskBoardQuery, clientToday?: string) {
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
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });

    const items = rows.map((row) => this.toListItem(row, clientToday));
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
      metrics: this.buildMetrics(items),
    };
  }

  async listTasks(
    organizationId: string,
    query: DailyTaskListQuery,
    clientToday?: string,
    employeeIdsForMyTasks?: readonly string[],
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

    return {
      items: rows.map((row) => this.toListItem(row, clientToday)),
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

  private buildMetrics(
    items: {
      stageKind: string;
      workflowStageKey: string | null;
      projectPhaseName: string | null;
      completedAt: string | null;
      isOverdue: boolean;
    }[],
  ) {
    return {
      total: items.length,
      todo: items.filter((t) => t.workflowStageKey === 'todo').length,
      inProgress: items.filter((t) => t.workflowStageKey === 'in_progress').length,
      review: items.filter((t) => t.workflowStageKey === 'review').length,
      completed: items.filter((t) => t.workflowStageKey === 'completed' || Boolean(t.completedAt)).length,
      overdue: items.filter((t) => t.isOverdue).length,
    };
  }

  async createTask(organizationId: string, adminId: string, input: CreateDailyTaskRequest) {
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
      const phase = await this.assertProjectPhaseForProject(
        organizationId,
        projectId,
        input.projectPhaseId!,
      );
      projectPhaseId = phase.id;
      const workflowStage = await this.prisma.dailyTaskWorkflowStage.findFirst({
        where: { id: input.workflowStageId, organizationId, isActive: true },
      });
      if (!workflowStage) throw new DailyTaskValidationError('Select a valid daily workflow status.');
      workflowStageId = workflowStage.id;
      markCompleted = workflowStage.isCompletedStage;
    }

    const taskId = randomUUID();
    const row = await this.prisma.$transaction(async (tx) => {
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
          assignDate: parseDateOnly(input.assignDate),
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

    return this.toListItem(row);
  }

  async getTask(organizationId: string, taskId: string, clientToday?: string) {
    const row = await this.prisma.dailyTask.findFirst({
      where: { id: taskId, organizationId },
      include: this.taskInclude(),
    });
    if (!row) throw new DailyTaskNotFoundError();
    return this.toListItem(row, clientToday);
  }

  async updateTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: UpdateDailyTaskRequest,
  ) {
    const existing = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!existing) throw new DailyTaskNotFoundError();

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

    return this.toListItem(row);
  }

  async moveTaskStage(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: MoveDailyTaskStageRequest,
  ) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();

    const stage = await this.prisma.dailyTaskWorkflowStage.findFirst({
      where: { id: input.workflowStageId, organizationId, isActive: true },
    });
    if (!stage) throw new DailyTaskValidationError('Select a valid daily workflow status.');

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.dailyTask.update({
        where: { id: taskId },
        data: {
          workflowStageId: stage.id,
          completedAt: stage.isCompletedStage ? new Date() : null,
          completedByAdminId: stage.isCompletedStage ? adminId : null,
        },
      });
      await tx.dailyTaskActivity.create({
        data: {
          id: randomUUID(),
          organizationId,
          dailyTaskId: taskId,
          actorAdminId: adminId,
          eventType: stage.isCompletedStage ? 'COMPLETED' : 'STAGE_CHANGED',
          metadata: { workflowStageId: stage.id, stageKey: stage.stageKey },
        },
      });
      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return this.toListItem(row);
  }

  async rescheduleTask(
    organizationId: string,
    adminId: string,
    taskId: string,
    input: RescheduleDailyTaskRequest,
  ) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, organizationId } });
    if (!task) throw new DailyTaskNotFoundError();
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
            fromAssignDate: dateOnly(fromAssignDate),
            toAssignDate: input.assignDate,
          },
        },
      });
      return tx.dailyTask.findFirstOrThrow({
        where: { id: taskId },
        include: this.taskInclude(),
      });
    });

    return this.toListItem(row);
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
  ) {
    const employeeIds = await this.findEmployeeIdsForAdmin(organizationId, adminId);
    if (employeeIds.length === 0) {
      return { items: [], total: 0, page: 1, pageSize: 50 };
    }

    const scope = query.scope ?? 'today';
    let assignDateFrom: string | undefined;
    let assignDateTo: string | undefined;
    let assignDate: string | undefined;
    let completedOnly: boolean | undefined;
    let overdueOnly: boolean | undefined;

    if (scope === 'today') assignDate = query.assignDate ?? clientToday;
    if (scope === 'upcoming') assignDateFrom = clientToday;
    if (scope === 'completed') completedOnly = true;
    if (scope === 'overdue') overdueOnly = true;

    return this.listTasks(
      organizationId,
      {
        page: 1,
        pageSize: 100,
        assignDate,
        assignDateFrom,
        assignDateTo,
        completedOnly,
        overdueOnly,
        sortBy: 'assignDate',
        sortDir: 'asc',
      },
      clientToday,
      employeeIds,
    );
  }
}
