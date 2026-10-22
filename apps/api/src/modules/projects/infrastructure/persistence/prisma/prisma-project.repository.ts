import { Inject, Injectable } from '@nestjs/common';
import { formatProjectNumber } from '@techwin/validation';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service.js';
import { PROJECT_NUMBER_SEQUENCE_KEY } from '../../../domain/constants/project-sequence.js';
import {
  ProjectNotFoundError,
  ProjectValidationError,
} from '../../../domain/errors/project.errors.js';
import { ProjectProgressPolicy } from '../../../domain/services/project-progress.policy.js';
import type { ProjectLifecycleTab } from '../../../domain/project-types.js';
import { ProjectSchedulePolicy } from '../../../domain/services/project-schedule.policy.js';
import type {
  ClientQuotationRecord,
  CreateProjectInput,
  PaginatedProjects,
  ProjectDetailRecord,
  ProjectListFilters,
  ProjectListRecord,
  ProjectListTabCounts,
  ProjectManagerRecord,
  ProjectPhaseInput,
  ProjectPhaseRecord,
  ProjectRepository,
  UpdateProjectInput,
} from '../../../domain/repositories/project.repository.js';
import type { ProjectStatus } from '../../../domain/project-types.js';

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const parseDateOnly = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const listInclude = {
  phases: { select: { status: true } },
} satisfies Prisma.ProjectInclude;

const detailInclude = {
  projectManager: { select: { displayName: true } },
  phases: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async nextSequence(
    tx: Pick<PrismaService, 'organizationSequence'>,
    organizationId: string,
    key: string,
  ): Promise<number> {
    const row = await tx.organizationSequence.upsert({
      where: { organizationId_key: { organizationId, key } },
      create: { organizationId, key, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });
    return row.lastValue;
  }

  private async writeAudit(
    tx: Pick<PrismaService, 'crmAuditEvent'>,
    organizationId: string,
    audit: {
      adminId: string | null;
      type: 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_DELETED';
      entityId: string;
    },
  ) {
    await tx.crmAuditEvent.create({
      data: {
        organizationId,
        adminId: audit.adminId,
        type: audit.type,
        entityType: 'project',
        entityId: audit.entityId,
      },
    });
  }

  private toListRecord(
    row: Prisma.ProjectGetPayload<{ include: typeof listInclude }>,
  ): ProjectListRecord {
    return {
      id: row.id,
      projectNumber: row.projectNumber,
      name: row.name,
      clientId: row.clientId,
      clientName: row.clientName,
      companyName: row.companyName,
      priority: row.priority,
      startDate: dateOnly(row.startDate),
      status: row.status,
      phaseCount: row.phases.length,
      progressPercent: ProjectProgressPolicy.calculatePercent(row.phases),
    };
  }

  private toPhaseRecord(row: {
    id: string;
    name: string;
    description: string;
    phase: ProjectDetailRecord['currentPhase'];
    status: ProjectPhaseRecord['status'];
    startDate: Date;
    expectedEndDate: Date;
    ownerAdminId: string | null;
    sortOrder: number;
  }): ProjectPhaseRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      phase: row.phase,
      status: row.status,
      startDate: dateOnly(row.startDate),
      expectedEndDate: dateOnly(row.expectedEndDate),
      ownerAdminId: row.ownerAdminId,
      sortOrder: row.sortOrder,
    };
  }

  private toDetailRecord(
    row: Prisma.ProjectGetPayload<{ include: typeof detailInclude }>,
  ): ProjectDetailRecord {
    const list = this.toListRecord(row);
    return {
      ...list,
      projectManagerAdminId: row.projectManagerAdminId,
      projectManagerName: row.projectManager?.displayName ?? null,
      expectedEndDate: dateOnly(row.expectedEndDate),
      currentPhase: row.currentPhase,
      description: row.description,
      clientPhone: row.clientPhone,
      clientEmail: row.clientEmail,
      proposalId: row.proposalId,
      quotationNumber: row.quotationNumberSnapshot,
      quotationTitle: row.quotationTitleSnapshot,
      acceptedCommercialValue: row.acceptedCommercialValue?.toString() ?? null,
      currency: row.currency,
      scopeAndRequirements: row.scopeAndRequirements,
      mainDeliverables: row.mainDeliverables,
      acceptanceCriteria: row.acceptanceCriteria,
      internalNotes: row.internalNotes,
      phases: row.phases.map((phase) => this.toPhaseRecord(phase)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertAdminInOrg(organizationId: string, adminId: string | null | undefined) {
    if (!adminId) return;
    const admin = await this.prisma.platformAdmin.findFirst({
      where: { id: adminId, organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!admin) throw new ProjectValidationError('Selected team member is not available.');
  }

  private async loadClient(organizationId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
    });
    if (!client) throw new ProjectNotFoundError('Client');
    return client;
  }

  private async loadProposalForClient(
    organizationId: string,
    clientId: string,
    proposalId: string | null | undefined,
  ) {
    if (!proposalId) return null;
    const proposal = await this.prisma.proposalDocument.findFirst({
      where: {
        id: proposalId,
        organizationId,
        clientId,
        type: 'QUOTATION',
      },
    });
    if (!proposal) {
      throw new ProjectValidationError('Selected quotation is not valid for this client.');
    }
    return proposal;
  }

  private clientSnapshots(client: {
    name: string;
    primaryContact: string;
    phone: string | null;
    email: string | null;
  }) {
    return {
      clientName: client.name,
      companyName: client.primaryContact,
      clientPhone: client.phone ?? '',
      clientEmail: client.email ?? '',
    };
  }

  private quotationSnapshots(proposal: {
    documentNumber: string;
    title: string;
    grandTotal: Decimal;
    currency: string;
  } | null) {
    if (!proposal) {
      return {
        quotationNumberSnapshot: '',
        quotationTitleSnapshot: '',
        acceptedCommercialValue: null as Decimal | null,
        currency: 'INR',
      };
    }
    return {
      quotationNumberSnapshot: proposal.documentNumber,
      quotationTitleSnapshot: proposal.title,
      acceptedCommercialValue: proposal.grandTotal,
      currency: proposal.currency,
    };
  }

  private buildListBaseWhere(
    organizationId: string,
    filters: Pick<ProjectListFilters, 'search' | 'status' | 'priority'>,
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

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private lifecycleTabWhere(tab: ProjectLifecycleTab | undefined, todayIso: string): Prisma.ProjectWhereInput {
    if (!tab || tab === 'ALL') return {};
    const today = parseDateOnly(todayIso);
    if (tab === 'COMPLETED') {
      return { status: 'COMPLETED' };
    }
    const activeLifecycle: Prisma.ProjectWhereInput = {
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };
    if (tab === 'UPCOMING') {
      return { ...activeLifecycle, startDate: { gt: today } };
    }
    return { ...activeLifecycle, startDate: { lte: today } };
  }

  private async countTabBuckets(
    baseWhere: Prisma.ProjectWhereInput,
    todayIso: string,
  ): Promise<ProjectListTabCounts> {
    const [all, upcoming, ongoing, completed] = await Promise.all([
      this.prisma.project.count({ where: baseWhere }),
      this.prisma.project.count({
        where: {
          AND: [baseWhere, this.lifecycleTabWhere('UPCOMING', todayIso)],
        },
      }),
      this.prisma.project.count({
        where: {
          AND: [baseWhere, this.lifecycleTabWhere('ONGOING', todayIso)],
        },
      }),
      this.prisma.project.count({
        where: {
          AND: [baseWhere, this.lifecycleTabWhere('COMPLETED', todayIso)],
        },
      }),
    ]);
    return { all, upcoming, ongoing, completed };
  }

  private assertPhaseDateRange(startDate: string, expectedEndDate: string): void {
    ProjectSchedulePolicy.assertProjectDateRange(startDate, expectedEndDate);
  }

  private async assertPhaseOwners(
    organizationId: string,
    phases: readonly ProjectPhaseInput[],
  ): Promise<void> {
    for (const phase of phases) {
      await this.assertAdminInOrg(organizationId, phase.ownerAdminId);
      this.assertPhaseDateRange(phase.startDate, phase.expectedEndDate);
    }
  }

  private async syncProjectPhases(
    tx: Pick<PrismaService, 'projectPhase'>,
    organizationId: string,
    projectId: string,
    phases: readonly ProjectPhaseInput[],
    existingPhases: readonly ProjectPhaseRecord[],
  ): Promise<void> {
    const existingById = new Map(existingPhases.map((phase) => [phase.id, phase]));
    const retainedIds = new Set<string>();

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index]!;
      const sortOrder = index + 1;
      const description = phase.description ?? '';
      if (phase.id && existingById.has(phase.id)) {
        retainedIds.add(phase.id);
        await tx.projectPhase.update({
          where: { id: phase.id },
          data: {
            name: phase.name,
            description,
            startDate: parseDateOnly(phase.startDate),
            expectedEndDate: parseDateOnly(phase.expectedEndDate),
            sortOrder,
            ...(phase.ownerAdminId !== undefined ? { ownerAdminId: phase.ownerAdminId } : {}),
            ...(phase.status ? { status: phase.status } : {}),
          },
        });
        continue;
      }
      const id = crypto.randomUUID();
      retainedIds.add(id);
      await tx.projectPhase.create({
        data: {
          id,
          organizationId,
          projectId,
          phase: 'PLANNING',
          name: phase.name,
          description,
          status: phase.status ?? 'NOT_STARTED',
          startDate: parseDateOnly(phase.startDate),
          expectedEndDate: parseDateOnly(phase.expectedEndDate),
          ownerAdminId: phase.ownerAdminId ?? null,
          sortOrder,
        },
      });
    }

    for (const existing of existingPhases) {
      if (retainedIds.has(existing.id)) continue;
      await tx.projectPhase.delete({ where: { id: existing.id } });
    }
  }

  async listProjects(organizationId: string, filters: ProjectListFilters): Promise<PaginatedProjects> {
    const todayIso = this.todayIso();
    const baseWhere = this.buildListBaseWhere(organizationId, filters);
    const tabWhere = this.lifecycleTabWhere(filters.lifecycleTab, todayIso);
    const where: Prisma.ProjectWhereInput =
      tabWhere && Object.keys(tabWhere).length > 0 ? { AND: [baseWhere, tabWhere] } : baseWhere;
    const skip = (filters.page - 1) * filters.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: listInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: filters.pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);
    const tabCounts = await this.countTabBuckets(baseWhere, todayIso);
    return {
      items: rows.map((row) => this.toListRecord(row)),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      tabCounts,
    };
  }

  async getProject(organizationId: string, projectId: string): Promise<ProjectDetailRecord | null> {
    const row = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: detailInclude,
    });
    return row ? this.toDetailRecord(row) : null;
  }

  async previewProjectNumber(organizationId: string): Promise<string> {
    const row = await this.prisma.organizationSequence.findUnique({
      where: { organizationId_key: { organizationId, key: PROJECT_NUMBER_SEQUENCE_KEY } },
      select: { lastValue: true },
    });
    return formatProjectNumber((row?.lastValue ?? 0) + 1);
  }

  async listProjectManagers(organizationId: string): Promise<readonly ProjectManagerRecord[]> {
    const rows = await this.prisma.platformAdmin.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: [{ displayName: 'asc' }],
      select: { id: true, displayName: true, email: true },
    });
    return rows;
  }

  async listClientQuotations(
    organizationId: string,
    clientId: string,
  ): Promise<readonly ClientQuotationRecord[]> {
    const client = await this.loadClient(organizationId, clientId);
    const rows = await this.prisma.proposalDocument.findMany({
      where: { organizationId, clientId: client.id, type: 'QUOTATION' },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        documentNumber: true,
        title: true,
        grandTotal: true,
        status: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      title: row.title,
      grandTotal: row.grandTotal.toString(),
      status: row.status,
    }));
  }

  async createProject(
    organizationId: string,
    input: CreateProjectInput,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord> {
    const client = await this.loadClient(organizationId, input.clientId);
    await this.assertAdminInOrg(organizationId, input.projectManagerAdminId);
    const phases = input.phases ?? [];
    await this.assertPhaseOwners(organizationId, phases);
    const proposal = await this.loadProposalForClient(organizationId, client.id, input.proposalId);
    const clientSnap = this.clientSnapshots(client);
    const quoteSnap = this.quotationSnapshots(proposal);
    ProjectSchedulePolicy.assertProjectDateRange(input.startDate, input.expectedEndDate);
    if (phases.length > 0) {
      ProjectSchedulePolicy.assertProjectPhaseSchedule(
        input.startDate,
        input.expectedEndDate,
        phases.map((phase) => ({
          startDate: phase.startDate,
          expectedEndDate: phase.expectedEndDate,
        })),
      );
    }
    const commercial =
      input.acceptedCommercialValue !== undefined &&
      input.acceptedCommercialValue !== null &&
      input.acceptedCommercialValue !== ''
        ? new Decimal(input.acceptedCommercialValue)
        : quoteSnap.acceptedCommercialValue;

    const projectId = crypto.randomUUID();

    await this.prisma.$transaction(async (tx) => {
      const seq = await this.nextSequence(tx, organizationId, PROJECT_NUMBER_SEQUENCE_KEY);
      const projectNumber = formatProjectNumber(seq);
      await tx.project.create({
        data: {
          id: projectId,
          organizationId,
          projectNumber,
          name: input.name,
          description: input.description ?? '',
          priority: input.priority,
          status: 'ACTIVE',
          currentPhase: 'PLANNING',
          clientId: client.id,
          proposalId: proposal?.id ?? null,
          projectManagerAdminId: input.projectManagerAdminId ?? null,
          startDate: parseDateOnly(input.startDate),
          expectedEndDate: parseDateOnly(input.expectedEndDate),
          ...clientSnap,
          quotationNumberSnapshot: quoteSnap.quotationNumberSnapshot,
          quotationTitleSnapshot: quoteSnap.quotationTitleSnapshot,
          acceptedCommercialValue: commercial,
          currency: quoteSnap.currency,
          scopeAndRequirements: input.scopeAndRequirements ?? '',
          mainDeliverables: '',
          acceptanceCriteria: '',
          internalNotes: '',
          createdByAdminId: input.createdByAdminId,
        },
      });
      if (phases.length > 0) {
        await this.syncProjectPhases(tx, organizationId, projectId, phases, []);
      }
      await this.writeAudit(tx, organizationId, {
        adminId: audit.adminId,
        type: 'PROJECT_CREATED',
        entityId: projectId,
      });
    });

    const created = await this.getProject(organizationId, projectId);
    if (!created) throw new ProjectNotFoundError('Project');
    return created;
  }

  async updateProject(
    organizationId: string,
    projectId: string,
    input: UpdateProjectInput,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord> {
    const existing = await this.getProject(organizationId, projectId);
    if (!existing) throw new ProjectNotFoundError('Project');

    const clientId = input.clientId ?? existing.clientId;
    const client = await this.loadClient(organizationId, clientId);
    await this.assertAdminInOrg(organizationId, input.projectManagerAdminId);
    if (input.phases) {
      await this.assertPhaseOwners(organizationId, input.phases);
    }

    let effectiveProposalId =
      input.proposalId !== undefined ? input.proposalId : existing.proposalId;
    if (input.clientId && input.clientId !== existing.clientId && input.proposalId === undefined) {
      const stillValid =
        existing.proposalId &&
        (await this.prisma.proposalDocument.findFirst({
          where: {
            id: existing.proposalId,
            organizationId,
            clientId: input.clientId,
          },
        }));
      if (!stillValid) {
        effectiveProposalId = null;
      }
    }
    const proposal = await this.loadProposalForClient(organizationId, client.id, effectiveProposalId);
    const clientSnap = this.clientSnapshots(client);
    const quoteSnap = this.quotationSnapshots(proposal);

    const effectiveStartDate = input.startDate ?? existing.startDate;
    const effectiveEndDate = input.expectedEndDate ?? existing.expectedEndDate;
    ProjectSchedulePolicy.assertProjectDateRange(effectiveStartDate, effectiveEndDate);
    if (input.phases && input.phases.length > 0) {
      ProjectSchedulePolicy.assertProjectPhaseSchedule(
        effectiveStartDate,
        effectiveEndDate,
        input.phases.map((phase) => ({
          startDate: phase.startDate,
          expectedEndDate: phase.expectedEndDate,
        })),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.projectManagerAdminId !== undefined
            ? { projectManagerAdminId: input.projectManagerAdminId }
            : {}),
          ...(input.startDate !== undefined
            ? { startDate: parseDateOnly(input.startDate) }
            : {}),
          ...(input.expectedEndDate !== undefined
            ? { expectedEndDate: parseDateOnly(input.expectedEndDate) }
            : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.clientId !== undefined ? { clientId: client.id, ...clientSnap } : {}),
          ...(input.proposalId !== undefined ||
          input.clientId !== undefined ||
          effectiveProposalId !== existing.proposalId
            ? {
                proposalId: proposal?.id ?? null,
                quotationNumberSnapshot: quoteSnap.quotationNumberSnapshot,
                quotationTitleSnapshot: quoteSnap.quotationTitleSnapshot,
                acceptedCommercialValue:
                  input.acceptedCommercialValue !== undefined &&
      input.acceptedCommercialValue !== null &&
      input.acceptedCommercialValue !== ''
                    ? new Decimal(input.acceptedCommercialValue)
                    : quoteSnap.acceptedCommercialValue,
                currency: quoteSnap.currency,
              }
            : input.acceptedCommercialValue !== undefined
              ? {
                  acceptedCommercialValue:
                    input.acceptedCommercialValue !== undefined &&
      input.acceptedCommercialValue !== null &&
      input.acceptedCommercialValue !== ''
                      ? new Decimal(input.acceptedCommercialValue)
                      : null,
                }
              : {}),
          ...(input.scopeAndRequirements !== undefined
            ? { scopeAndRequirements: input.scopeAndRequirements }
            : {}),
        },
      });

      if (input.phases) {
        await this.syncProjectPhases(
          tx,
          organizationId,
          projectId,
          input.phases,
          existing.phases,
        );
      }

      await this.writeAudit(tx, organizationId, {
        adminId: audit.adminId,
        type: 'PROJECT_UPDATED',
        entityId: projectId,
      });
    });

    const updated = await this.getProject(organizationId, projectId);
    if (!updated) throw new ProjectNotFoundError('Project');
    return updated;
  }

  async changeProjectStatus(
    organizationId: string,
    projectId: string,
    status: ProjectStatus,
    audit: { adminId: string | null },
  ): Promise<ProjectDetailRecord> {
    const existing = await this.getProject(organizationId, projectId);
    if (!existing) throw new ProjectNotFoundError('Project');
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status },
      });
      await this.writeAudit(tx, organizationId, {
        adminId: audit.adminId,
        type: 'PROJECT_UPDATED',
        entityId: projectId,
      });
    });
    const updated = await this.getProject(organizationId, projectId);
    if (!updated) throw new ProjectNotFoundError('Project');
    return updated;
  }

  async deleteProject(
    organizationId: string,
    projectId: string,
    audit: { adminId: string | null },
  ): Promise<void> {
    const existing = await this.getProject(organizationId, projectId);
    if (!existing) throw new ProjectNotFoundError('Project');
    await this.prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id: projectId } });
      await this.writeAudit(tx, organizationId, {
        adminId: audit.adminId,
        type: 'PROJECT_DELETED',
        entityId: projectId,
      });
    });
  }
}
