import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import {
  ProjectNotFoundError,
  ProjectValidationError,
} from '../../../domain/errors/project.errors.js';
import { ProjectTaskProgressPolicy } from '../../../domain/services/project-task-progress.policy.js';
import { ProjectExecutionLifecyclePolicy } from '../../../domain/services/project-execution-lifecycle.policy.js';
import type { ProjectExecutionLifecycle, ProjectLifecycleTab } from '../../../domain/project-types.js';
import type {
  CreateProjectTaskInput,
  PaginatedProjectTaskSummaries,
  ProjectTaskBoardRecord,
  ProjectTaskRecord,
  ProjectTaskRepository,
  ProjectTaskSummaryListFilters,
  UpdateProjectTaskInput,
} from '../../../domain/repositories/project-task.repository.js';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const parseDateOnly = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const parseOptionalDate = (iso: string | null | undefined): Date | null =>
  iso ? parseDateOnly(iso) : null;

const taskInclude = {
  assignee: { select: { id: true, displayName: true, email: true } },
} satisfies Prisma.ProjectTaskInclude;

@Injectable()
export class PrismaProjectTaskRepository implements ProjectTaskRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private lifecycleTabWhere(tab: ProjectLifecycleTab | undefined): Prisma.ProjectWhereInput {
    if (!tab || tab === 'ALL') return {};
    return { executionLifecycle: tab };
  }

  private buildListBaseWhere(
    organizationId: string,
    filters: Pick<ProjectTaskSummaryListFilters, 'search' | 'status' | 'priority'>,
  ): Prisma.ProjectWhereInput {
    return {
      organizationId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.search
        ? {
            OR: [
              { projectNumber: { contains: filters.search, mode: 'insensitive' as const } },
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              { clientName: { contains: filters.search, mode: 'insensitive' as const } },
              { companyName: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
  }

  private async countTabBuckets(baseWhere: Prisma.ProjectWhereInput) {
    const [all, notPlanned, planned, inProduction, completed] = await Promise.all([
      this.prisma.project.count({ where: baseWhere }),
      this.prisma.project.count({
        where: { AND: [baseWhere, this.lifecycleTabWhere('NOT_PLANNED')] },
      }),
      this.prisma.project.count({
        where: { AND: [baseWhere, this.lifecycleTabWhere('PLANNED')] },
      }),
      this.prisma.project.count({
        where: { AND: [baseWhere, this.lifecycleTabWhere('IN_PRODUCTION')] },
      }),
      this.prisma.project.count({
        where: { AND: [baseWhere, this.lifecycleTabWhere('COMPLETED')] },
      }),
    ]);
    return { all, notPlanned, planned, inProduction, completed };
  }

  private toTaskRecord(
    row: Prisma.ProjectTaskGetPayload<{ include: typeof taskInclude }>,
  ): ProjectTaskRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      phaseId: row.phaseId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeAdminId: row.assigneeAdminId,
      assignee: row.assignee
        ? {
            id: row.assignee.id,
            displayName: row.assignee.displayName,
            email: row.assignee.email,
          }
        : null,
      startDate: row.startDate ? dateOnly(row.startDate) : null,
      dueDate: row.dueDate ? dateOnly(row.dueDate) : null,
      actualStartedAt: row.actualStartedAt?.toISOString() ?? null,
      actualCompletedAt: row.actualCompletedAt?.toISOString() ?? null,
      labels: row.labels,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private taskStats(tasks: readonly { status: ProjectTaskRecord['status'] }[]) {
    const taskCount = tasks.length;
    const completedTaskCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    return {
      taskCount,
      completedTaskCount,
      progressPercent: ProjectTaskProgressPolicy.calculatePercent(tasks),
    };
  }

  private async assertProject(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, executionLifecycle: true },
    });
    if (!project) throw new ProjectNotFoundError('Project');
    return project;
  }

  private assertCanMutateTasks(executionLifecycle: ProjectExecutionLifecycle): void {
    if (executionLifecycle === 'COMPLETED') {
      throw new ProjectValidationError('Completed projects are read-only.');
    }
  }

  private async assertPhaseInProject(
    organizationId: string,
    projectId: string,
    phaseId: string,
  ) {
    const phase = await this.prisma.projectPhase.findFirst({
      where: { id: phaseId, organizationId, projectId },
      select: { id: true },
    });
    if (!phase) throw new ProjectValidationError('Selected phase is not valid for this project.');
    return phase;
  }

  private async assertAssignee(organizationId: string, assigneeAdminId: string | null | undefined) {
    if (!assigneeAdminId) return;
    const admin = await this.prisma.platformAdmin.findFirst({
      where: { id: assigneeAdminId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!admin) throw new ProjectValidationError('Selected assignee is not available.');
  }

  async listProjectSummaries(
    organizationId: string,
    filters: ProjectTaskSummaryListFilters,
  ): Promise<PaginatedProjectTaskSummaries> {
    const baseWhere = this.buildListBaseWhere(organizationId, filters);
    const where: Prisma.ProjectWhereInput = {
      AND: [baseWhere, this.lifecycleTabWhere(filters.lifecycleTab)],
    };
    const page = filters.page;
    const pageSize = filters.pageSize;
    const skip = (page - 1) * pageSize;

    const [tabCounts, total, rows] = await Promise.all([
      this.countTabBuckets(baseWhere),
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { projectNumber: 'desc' }],
        skip,
        take: pageSize,
        include: {
          phases: { orderBy: { sortOrder: 'asc' } },
          tasks: { select: { status: true, phaseId: true } },
        },
      }),
    ]);

    const items = rows.map((row) => {
      const stats = this.taskStats(row.tasks);
      const tasksByPhase = new Map<string, { status: ProjectTaskRecord['status'] }[]>();
      for (const task of row.tasks) {
        const bucket = tasksByPhase.get(task.phaseId) ?? [];
        bucket.push({ status: task.status });
        tasksByPhase.set(task.phaseId, bucket);
      }
      const phases = row.phases.map((phase) => {
        const phaseTasks = tasksByPhase.get(phase.id) ?? [];
        return {
          id: phase.id,
          name: phase.name,
          status: phase.status,
          startDate: dateOnly(phase.startDate),
          expectedEndDate: dateOnly(phase.expectedEndDate),
          actualStartedAt: phase.actualStartedAt?.toISOString() ?? null,
          actualCompletedAt: phase.actualCompletedAt?.toISOString() ?? null,
          sortOrder: phase.sortOrder,
          ...this.taskStats(phaseTasks),
        };
      });
      return {
        id: row.id,
        projectNumber: row.projectNumber,
        name: row.name,
        clientId: row.clientId,
        clientName: row.clientName,
        companyName: row.companyName,
        priority: row.priority,
        status: row.status,
        executionLifecycle: row.executionLifecycle,
        actualProductionStartedAt: row.actualProductionStartedAt?.toISOString() ?? null,
        actualCompletedAt: row.actualCompletedAt?.toISOString() ?? null,
        startDate: dateOnly(row.startDate),
        expectedEndDate: dateOnly(row.expectedEndDate),
        phaseCount: phases.length,
        phases,
        ...stats,
      };
    });

    return { items, total, page, pageSize, tabCounts };
  }

  async getProjectBoard(organizationId: string, projectId: string): Promise<ProjectTaskBoardRecord> {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        phases: { orderBy: { sortOrder: 'asc' } },
        tasks: { include: taskInclude, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!row) throw new ProjectNotFoundError('Project');

    const tasksByPhase = new Map<string, ProjectTaskRecord[]>();
    for (const task of row.tasks) {
      const record = this.toTaskRecord(task);
      const bucket = tasksByPhase.get(task.phaseId) ?? [];
      bucket.push(record);
      tasksByPhase.set(task.phaseId, bucket);
    }

    const allTasks = row.tasks.map((t) => ({ status: t.status }));
    const projectStats = this.taskStats(allTasks);

    const phases = row.phases.map((phase) => {
      const phaseTasks = tasksByPhase.get(phase.id) ?? [];
      const stats = this.taskStats(phaseTasks);
      return {
        id: phase.id,
        name: phase.name,
        description: phase.description,
        status: phase.status,
        startDate: dateOnly(phase.startDate),
        expectedEndDate: dateOnly(phase.expectedEndDate),
        actualStartedAt: phase.actualStartedAt?.toISOString() ?? null,
        actualCompletedAt: phase.actualCompletedAt?.toISOString() ?? null,
        sortOrder: phase.sortOrder,
        tasks: phaseTasks,
        ...stats,
      };
    });

    return {
      project: {
        id: row.id,
        projectNumber: row.projectNumber,
        name: row.name,
        clientName: row.clientName,
        companyName: row.companyName,
        status: row.status,
        executionLifecycle: row.executionLifecycle,
        actualProductionStartedAt: row.actualProductionStartedAt?.toISOString() ?? null,
        actualCompletedAt: row.actualCompletedAt?.toISOString() ?? null,
        priority: row.priority,
        startDate: dateOnly(row.startDate),
        expectedEndDate: dateOnly(row.expectedEndDate),
        phaseCount: row.phases.length,
        ...projectStats,
      },
      phases,
    };
  }

  async getTask(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<ProjectTaskRecord | null> {
    const row = await this.prisma.projectTask.findFirst({
      where: { id: taskId, organizationId, projectId },
      include: taskInclude,
    });
    return row ? this.toTaskRecord(row) : null;
  }

  async createTask(
    organizationId: string,
    projectId: string,
    input: CreateProjectTaskInput,
  ): Promise<ProjectTaskRecord> {
    const project = await this.assertProject(organizationId, projectId);
    this.assertCanMutateTasks(project.executionLifecycle);
    ProjectExecutionLifecyclePolicy.assertCanMutatePlanBaseline(project.executionLifecycle);
    await this.assertPhaseInProject(organizationId, projectId, input.phaseId);
    await this.assertAssignee(organizationId, input.assigneeAdminId);

    const sortOrder = await this.nextSortOrder(organizationId, input.phaseId);

    const row = await this.prisma.projectTask.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        projectId,
        phaseId: input.phaseId,
        title: input.title,
        description: input.description ?? '',
        status: input.status,
        priority: input.priority,
        assigneeAdminId: input.assigneeAdminId ?? null,
        startDate: parseOptionalDate(input.startDate),
        dueDate: parseOptionalDate(input.dueDate),
        labels: input.labels ? [...input.labels] : [],
        sortOrder,
      },
      include: taskInclude,
    });
    return this.toTaskRecord(row);
  }

  async updateTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    input: UpdateProjectTaskInput,
  ): Promise<ProjectTaskRecord> {
    const project = await this.assertProject(organizationId, projectId);
    this.assertCanMutateTasks(project.executionLifecycle);
    const existing = await this.getTask(organizationId, projectId, taskId);
    if (!existing) throw new ProjectNotFoundError('Task');
    if (project.executionLifecycle === 'IN_PRODUCTION') {
      ProjectExecutionLifecyclePolicy.assertCanUpdateTaskInProduction(input);
    } else if (
      project.executionLifecycle === 'NOT_PLANNED' ||
      project.executionLifecycle === 'PLANNED'
    ) {
      ProjectExecutionLifecyclePolicy.assertCanSavePlan(project.executionLifecycle);
    }

    if (input.phaseId) {
      await this.assertPhaseInProject(organizationId, projectId, input.phaseId);
    }
    if (input.assigneeAdminId !== undefined) {
      await this.assertAssignee(organizationId, input.assigneeAdminId);
    }

    const nextPhaseId = input.phaseId ?? existing.phaseId;
    const phaseChanged = nextPhaseId !== existing.phaseId;
    const nextStatus = input.status ?? existing.status;
    const now = new Date();
    const recordActualStart =
      (nextStatus === 'IN_PROGRESS' || nextStatus === 'IN_REVIEW' || nextStatus === 'COMPLETED') &&
      !existing.actualStartedAt;
    const recordActualComplete = nextStatus === 'COMPLETED' && !existing.actualCompletedAt;

    const row = await this.prisma.$transaction(async (tx) => {
      if (phaseChanged) {
        const destinationIds = await this.listPhaseTaskIds(tx, organizationId, nextPhaseId);
        const without = destinationIds.filter((id) => id !== taskId);
        without.push(taskId);
        await this.applyTaskOrder(tx, organizationId, nextPhaseId, without);
      }

      const updated = await tx.projectTask.update({
        where: { id: taskId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.phaseId !== undefined ? { phaseId: input.phaseId } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.assigneeAdminId !== undefined
            ? { assigneeAdminId: input.assigneeAdminId }
            : {}),
          ...(input.startDate !== undefined
            ? { startDate: parseOptionalDate(input.startDate) }
            : {}),
          ...(input.dueDate !== undefined ? { dueDate: parseOptionalDate(input.dueDate) } : {}),
          ...(input.labels !== undefined ? { labels: [...input.labels] } : {}),
          ...(recordActualStart ? { actualStartedAt: now } : {}),
          ...(recordActualComplete ? { actualCompletedAt: now } : {}),
          ...(phaseChanged
            ? {
                sortOrder: (await this.listPhaseTaskIds(tx, organizationId, nextPhaseId)).length - 1,
              }
            : {}),
        },
        include: taskInclude,
      });
      await this.syncPhaseActualTimes(tx, organizationId, nextPhaseId);
      if (phaseChanged) {
        await this.syncPhaseActualTimes(tx, organizationId, existing.phaseId);
      }
      return updated;
    });

    return this.toTaskRecord(row);
  }

  async deleteTask(organizationId: string, projectId: string, taskId: string): Promise<void> {
    const project = await this.assertProject(organizationId, projectId);
    this.assertCanMutateTasks(project.executionLifecycle);
    ProjectExecutionLifecyclePolicy.assertCanMutatePlanBaseline(project.executionLifecycle);
    const existing = await this.getTask(organizationId, projectId, taskId);
    if (!existing) throw new ProjectNotFoundError('Task');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectTask.delete({ where: { id: taskId } });
      const remaining = await this.listPhaseTaskIds(tx, organizationId, existing.phaseId);
      const ordered = remaining.filter((id) => id !== taskId);
      await this.applyTaskOrder(tx, organizationId, existing.phaseId, ordered);
    });
  }

  async moveTask(
    organizationId: string,
    projectId: string,
    taskId: string,
    phaseId: string,
    beforeTaskId: string | null | undefined,
  ): Promise<ProjectTaskRecord> {
    const project = await this.assertProject(organizationId, projectId);
    this.assertCanMutateTasks(project.executionLifecycle);
    ProjectExecutionLifecyclePolicy.assertCanMutatePlanBaseline(project.executionLifecycle);
    const task = await this.getTask(organizationId, projectId, taskId);
    if (!task) throw new ProjectNotFoundError('Task');
    await this.assertPhaseInProject(organizationId, projectId, phaseId);

    const destinationIds = await this.listPhaseTaskIds(this.prisma, organizationId, phaseId);
    const withoutActive = destinationIds.filter((id) => id !== taskId);
    const insertIndex = this.resolveInsertIndex(withoutActive, beforeTaskId);
    const nextDestinationIds = [...withoutActive];
    nextDestinationIds.splice(insertIndex, 0, taskId);

    const phaseChanged = task.phaseId !== phaseId;
    const sourcePhaseId = task.phaseId;
    if (!phaseChanged && this.sameIdOrder(destinationIds, nextDestinationIds)) {
      return task;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (phaseChanged) {
        const sourceIds = (await this.listPhaseTaskIds(tx, organizationId, sourcePhaseId)).filter(
          (id) => id !== taskId,
        );
        await this.applyTaskOrder(tx, organizationId, sourcePhaseId, sourceIds);
        await tx.projectTask.update({
          where: { id: taskId },
          data: { phaseId },
        });
      }
      await this.applyTaskOrder(tx, organizationId, phaseId, nextDestinationIds);
      return tx.projectTask.findFirstOrThrow({
        where: { id: taskId, organizationId, projectId },
        include: taskInclude,
      });
    });

    return this.toTaskRecord(row);
  }

  private async syncPhaseActualTimes(
    tx: Pick<PrismaService, 'projectPhase' | 'projectTask'>,
    organizationId: string,
    phaseId: string,
  ): Promise<void> {
    const phase = await tx.projectPhase.findFirst({
      where: { id: phaseId, organizationId },
      select: { id: true, actualStartedAt: true, actualCompletedAt: true },
    });
    if (!phase) return;
    const tasks = await tx.projectTask.findMany({
      where: { organizationId, phaseId },
      select: { status: true },
    });
    const anyActive = tasks.some(
      (task) =>
        task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW' || task.status === 'COMPLETED',
    );
    const allCompleted = tasks.length > 0 && tasks.every((task) => task.status === 'COMPLETED');
    const now = new Date();
    await tx.projectPhase.update({
      where: { id: phaseId },
      data: {
        ...(anyActive && !phase.actualStartedAt ? { actualStartedAt: now } : {}),
        ...(allCompleted && !phase.actualCompletedAt ? { actualCompletedAt: now } : {}),
        ...(allCompleted ? { status: 'COMPLETED' as const } : {}),
        ...(anyActive && !allCompleted ? { status: 'IN_PROGRESS' as const } : {}),
      },
    });
  }

  private resolveInsertIndex(orderedIds: readonly string[], beforeTaskId?: string | null): number {
    if (beforeTaskId === undefined || beforeTaskId === null) return orderedIds.length;
    const index = orderedIds.indexOf(beforeTaskId);
    return index < 0 ? orderedIds.length : index;
  }

  private sameIdOrder(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((id, index) => id === right[index]);
  }

  private async listPhaseTaskIds(
    client: Pick<PrismaService, 'projectTask'>,
    organizationId: string,
    phaseId: string,
  ): Promise<string[]> {
    const rows = await client.projectTask.findMany({
      where: { organizationId, phaseId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async nextSortOrder(organizationId: string, phaseId: string): Promise<number> {
    const max = await this.prisma.projectTask.aggregate({
      where: { organizationId, phaseId },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  private async applyTaskOrder(
    tx: Prisma.TransactionClient,
    organizationId: string,
    phaseId: string,
    orderedTaskIds: readonly string[],
  ): Promise<void> {
    await Promise.all(
      orderedTaskIds.map((id, index) =>
        tx.projectTask.updateMany({
          where: { id, organizationId, phaseId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
