import { PrismaService } from '../../../../../../../infrastructure/database/prisma.service.js';
import {
  CrmConflictError,
  CrmNotFoundError,
} from '../../../../domain/errors/crm.errors.js';
import type { PipelineRecord } from '../../../../domain/repositories/crm.repository.js';
import {
  DEFAULT_ORGANIZATION_NAME,
  ORGANIZATION_SLUG_TECHWIN,
} from '../../../../domain/repositories/crm.repository.js';
import { DEFAULT_PIPELINE_STAGES } from '../../../../domain/pipelines/default-stages.js';
import {
  DEFAULT_PIPELINE_NAME,
  pipelineStagesInclude,
  toPipeline,
} from './crm-persistence.shared.js';

export class CrmOrganizationPersistence {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOrganizationForAdmin(adminId: string): Promise<{ organizationId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const admin = await tx.platformAdmin.findUnique({
        where: { id: adminId },
        select: { organizationId: true },
      });
      if (!admin) throw new CrmNotFoundError('Administrator');
      if (admin.organizationId) return { organizationId: admin.organizationId };

      let organization = await tx.organization.findUnique({
        where: { slug: ORGANIZATION_SLUG_TECHWIN },
        select: { id: true },
      });
      if (!organization) {
        organization = await tx.organization.create({
          data: {
            id: crypto.randomUUID(),
            name: DEFAULT_ORGANIZATION_NAME,
            slug: ORGANIZATION_SLUG_TECHWIN,
          },
          select: { id: true },
        });
      }

      const linked = await tx.platformAdmin.updateMany({
        where: { id: adminId, organizationId: null },
        data: { organizationId: organization.id },
      });
      if (linked.count === 0) {
        const refreshed = await tx.platformAdmin.findUniqueOrThrow({
          where: { id: adminId },
          select: { organizationId: true },
        });
        if (!refreshed.organizationId) throw new CrmConflictError('Could not link organization.');
        return { organizationId: refreshed.organizationId };
      }
      return { organizationId: organization.id };
    });
  }

  async ensureDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    const existingDefault = await this.prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      include: { stages: pipelineStagesInclude },
    });
    if (existingDefault) return toPipeline(existingDefault);

    const fallback = await this.prisma.pipeline.findFirst({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { stages: pipelineStagesInclude },
    });

    if (fallback) {
      await this.prisma.$transaction([
        this.prisma.pipeline.updateMany({
          where: { organizationId },
          data: { isDefault: false },
        }),
        this.prisma.pipeline.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        }),
      ]);
      return toPipeline({ ...fallback, isDefault: true });
    }

    const pipelineId = crypto.randomUUID();
    const created = await this.prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.create({
        data: {
          id: pipelineId,
          organizationId,
          name: DEFAULT_PIPELINE_NAME,
          description: '',
          status: 'ACTIVE',
          isDefault: true,
          sortOrder: 0,
        },
      });
      for (let index = 0; index < DEFAULT_PIPELINE_STAGES.length; index += 1) {
        const stage = DEFAULT_PIPELINE_STAGES[index]!;
        await tx.pipelineStage.create({
          data: {
            id: crypto.randomUUID(),
            organizationId,
            pipelineId: pipeline.id,
            name: stage.name,
            description: '',
            color: stage.color,
            status: 'ACTIVE',
            outcome: stage.outcome,
            sortOrder: index + 1,
          },
        });
      }
      return tx.pipeline.findFirstOrThrow({
        where: { id: pipeline.id, organizationId },
        include: { stages: pipelineStagesInclude },
      });
    });
    return toPipeline(created);
  }

  async getDefaultPipeline(organizationId: string): Promise<PipelineRecord> {
    return this.ensureDefaultPipeline(organizationId);
  }
}
