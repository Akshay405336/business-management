import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '../../../../../../../generated/prisma/client.js';
import {
  formatLeadTagDisplayName,
  normalizeLeadTagSlug,
  parseLeadImportEstimatedValue,
  parseLeadImportPhone,
} from '@techwin/validation';
import type { CrmLeadImportPreviewRow, CrmLeadImportRowStatus } from '@techwin/contracts';
import { rethrowLeadContactUniqueViolation } from '../../../../../shared/infrastructure/persistence/prisma/mappers/lead-contact-unique-violation.js';
import {
  formatReference,
  nextKanbanSortOrder,
  nextSequence,
  writeAudit,
  type CrmPersistenceHost,
} from '../../../../../shared/infrastructure/persistence/prisma/repositories/crm-persistence.shared.js';
import { SEQUENCE_KEYS } from '../../../../../shared/domain/repositories/crm.repository.js';
import { LeadNotFoundError, LeadValidationError } from '../../../domain/errors/lead.errors.js';
import { resolveImportStageId } from '../../../domain/policies/lead-import-stage.policy.js';
import type { LeadAuditEntry } from '../../../domain/types/lead.types.js';
import type {
  CreateLeadTagData,
  LeadTagReadModel,
} from '../../../domain/types/lead-tag.types.js';
import { LeadContactService } from '../../../domain/services/lead-contact.service.js';
import type { LeadImportRowInput } from '../../../domain/types/lead-import.types.js';

const DEFAULT_TAGS: readonly { name: string; slug: string; color: string }[] = [
  { name: 'Urgent', slug: 'urgent', color: '#ef4444' },
  { name: 'Risk', slug: 'risk', color: '#f59e0b' },
  { name: 'Hot Lead', slug: 'hot-lead', color: '#22c55e' },
  { name: 'Follow Up', slug: 'follow-up', color: '#3b82f6' },
  { name: 'Important', slug: 'important', color: '#8b5cf6' },
];

type TagRow = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  color: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapTagRow(row: TagRow): LeadTagReadModel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    color: row.color,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSnapshot(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    status: row.status as 'ACTIVE' | 'INACTIVE',
  };
}

export class LeadTagPrismaStore {
  constructor(private readonly host: CrmPersistenceHost) {}

  private get prisma() {
    return this.host.prisma;
  }

  async ensureDefaultTags(organizationId: string): Promise<void> {
    for (const tag of DEFAULT_TAGS) {
      await this.prisma.leadTag.upsert({
        where: {
          organizationId_slug: { organizationId, slug: tag.slug },
        },
        create: {
          id: crypto.randomUUID(),
          organizationId,
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
        },
        update: {},
      });
    }
  }

  async listTags(organizationId: string, search?: string): Promise<LeadTagReadModel[]> {
    await this.ensureDefaultTags(organizationId);
    const rows = await this.prisma.leadTag.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
    });
    return rows.map(mapTagRow);
  }

  async createTag(organizationId: string, input: CreateLeadTagData): Promise<LeadTagReadModel> {
    const name = formatLeadTagDisplayName(input.name);
    const slug = normalizeLeadTagSlug(name);
    const duplicate = await this.prisma.leadTag.findFirst({
      where: { organizationId, slug },
      select: { id: true },
    });
    if (duplicate) {
      throw new LeadValidationError('A tag with this name already exists.', [
        { path: 'name', message: 'A tag with this name already exists.' },
      ]);
    }
    try {
      const row = await this.prisma.leadTag.create({
        data: {
          id: crypto.randomUUID(),
          organizationId,
          name,
          slug,
          color: input.color ?? '#64748b',
          status: 'ACTIVE',
        },
      });
      return mapTagRow(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new LeadValidationError('A tag with this name already exists.', [
          { path: 'name', message: 'A tag with this name already exists.' },
        ]);
      }
      throw error;
    }
  }

  async resolveTagIdsByNames(
    organizationId: string,
    names: readonly string[],
  ): Promise<{ readonly tagIds: string[]; readonly missing: string[] }> {
    await this.ensureDefaultTags(organizationId);
    const slugs = names.map((name) => normalizeLeadTagSlug(formatLeadTagDisplayName(name)));
    const tags = await this.prisma.leadTag.findMany({
      where: { organizationId, slug: { in: slugs }, status: 'ACTIVE' },
      select: { id: true, slug: true },
    });
    const bySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));
    const tagIds: string[] = [];
    const missing: string[] = [];
    for (let i = 0; i < names.length; i++) {
      const slug = slugs[i];
      const id = slug ? bySlug.get(slug) : undefined;
      if (id) tagIds.push(id);
      else missing.push(names[i] ?? '');
    }
    return { tagIds, missing };
  }

  async syncLeadAssignments(
    tx: Prisma.TransactionClient,
    organizationId: string,
    leadId: string,
    tagIds: readonly string[],
  ): Promise<string[]> {
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length > 0) {
      const valid = await tx.leadTag.findMany({
        where: { organizationId, id: { in: uniqueIds }, status: 'ACTIVE' },
        select: { id: true, name: true },
      });
      if (valid.length !== uniqueIds.length) {
        throw new LeadValidationError('One or more tags are invalid or inactive for this organization.');
      }
      await tx.leadTagAssignment.deleteMany({ where: { leadId } });
      await tx.leadTagAssignment.createMany({
        data: uniqueIds.map((tagId) => ({ leadId, tagId })),
        skipDuplicates: true,
      });
      const names = valid.map((tag: { name: string }) => tag.name).sort((a: string, b: string) => a.localeCompare(b));
      await tx.lead.update({ where: { id: leadId }, data: { tags: names } });
      return names;
    }
    await tx.leadTagAssignment.deleteMany({ where: { leadId } });
    await tx.lead.update({ where: { id: leadId }, data: { tags: [] } });
    return [];
  }

  async loadTagsByLeadIds(
    organizationId: string,
    leadIds: readonly string[],
  ): Promise<Map<string, ReturnType<typeof mapSnapshot>[]>> {
    if (leadIds.length === 0) return new Map();
    const rows = await this.prisma.leadTagAssignment.findMany({
      where: { leadId: { in: [...leadIds] }, tag: { organizationId } },
      include: { tag: true },
    });
    const map = new Map<string, ReturnType<typeof mapSnapshot>[]>();
    for (const row of rows) {
      const list = map.get(row.leadId) ?? [];
      list.push(mapSnapshot(row.tag));
      map.set(row.leadId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }

  async previewImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
  ): Promise<{
    rows: CrmLeadImportPreviewRow[];
    totalRows: number;
    validNewCount: number;
    existingCount: number;
    duplicateInFileCount: number;
    invalidCount: number;
    readyToImportCount: number;
  }> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
    });
    if (!pipeline) throw new LeadNotFoundError('Pipeline');

    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId },
      select: { id: true, name: true, status: true, sortOrder: true },
    });

    const phonesInFile = new Map<string, number[]>();
    for (const row of rows) {
      const phone = parseLeadImportPhone(row.phone);
      if (!phone) continue;
      const list = phonesInFile.get(phone) ?? [];
      list.push(row.rowNumber);
      phonesInFile.set(phone, list);
    }

    const previewRows: CrmLeadImportPreviewRow[] = [];
    let validNewCount = 0;
    let existingCount = 0;
    let duplicateInFileCount = 0;
    let invalidCount = 0;

    for (const row of rows) {
      const fullName = row.fullName?.trim() ?? '';
      const phone = parseLeadImportPhone(row.phone);
      const email =
        row.email === undefined || row.email === null
          ? null
          : typeof row.email === 'string'
            ? row.email
            : null;

      let status: CrmLeadImportRowStatus = 'NEW';
      let message = '';
      let existingLeadId: string | null = null;
      let existingLeadName: string | null = null;
      let existingPipelineId: string | null = null;
      let existingStageId: string | null = null;

      if (!fullName) {
        status = 'INVALID';
        message = 'Full name is required.';
      } else if (!phone) {
        status = 'INVALID';
        message = 'A valid phone number is required.';
      } else {
        const dupRows = phonesInFile.get(phone) ?? [];
        if (dupRows.length > 1) {
          status = 'DUPLICATE_IN_FILE';
          message = `Duplicate phone in file (rows ${dupRows.join(', ')}).`;
          duplicateInFileCount += 1;
        } else {
          const existing = await this.prisma.lead.findFirst({
            where: { organizationId, phone, archivedAt: null },
            select: {
              id: true,
              fullName: true,
              pipelineId: true,
              stageId: true,
            },
          });
          if (existing) {
            status = 'EXISTING';
            message = 'Lead with this phone already exists.';
            existingLeadId = existing.id;
            existingLeadName = existing.fullName;
            existingPipelineId = existing.pipelineId;
            existingStageId = existing.stageId;
            existingCount += 1;
          } else {
            const stageResult = resolveImportStageId(stages, row.stage);
            if (stageResult.error) {
              status = 'INVALID';
              message = stageResult.error;
            } else if (row.tags?.length) {
              const { missing } = await this.resolveTagIdsByNames(organizationId, row.tags);
              if (missing.length > 0) {
                status = 'INVALID';
                message = `Unknown tag(s): ${missing.join(', ')}.`;
              }
            }
            if (status === 'NEW') {
              validNewCount += 1;
              message = 'Ready to import.';
            }
          }
        }
      }

      if (status === 'INVALID') invalidCount += 1;

      previewRows.push({
        rowNumber: row.rowNumber,
        fullName,
        phone,
        email,
        stage: row.stage?.trim() || null,
        priority: (row.priority as CrmLeadImportPreviewRow['priority']) ?? null,
        tags: row.tags ? [...row.tags] : [],
        status,
        message,
        existingLeadId,
        existingLeadName,
        existingPipelineId,
        existingStageId,
      });
    }

    return {
      rows: previewRows,
      totalRows: rows.length,
      validNewCount,
      existingCount,
      duplicateInFileCount,
      invalidCount,
      readyToImportCount: validNewCount,
    };
  }

  async executeImport(
    organizationId: string,
    pipelineId: string,
    rows: readonly LeadImportRowInput[],
    adminId: string,
    audit: LeadAuditEntry,
  ): Promise<{
    importedCount: number;
    existingCount: number;
    duplicateCount: number;
    failedCount: number;
    importedLeadIds: string[];
    rowErrors: { rowNumber: number; message: string }[];
  }> {
    const preview = await this.previewImport(organizationId, pipelineId, rows);
    const _importable = preview.rows.filter((row) => row.status === 'NEW');
    const importedLeadIds: string[] = [];
    const rowErrors: { rowNumber: number; message: string }[] = [];

    const stages = await this.prisma.pipelineStage.findMany({
      where: { organizationId, pipelineId },
      select: { id: true, name: true, status: true, sortOrder: true },
    });

    for (const previewRow of preview.rows) {
      if (previewRow.status !== 'NEW') continue;
      const source = rows.find((row) => row.rowNumber === previewRow.rowNumber);
      if (!source) continue;

      const stageResult = resolveImportStageId(stages, source.stage);
      if (!stageResult.stageId) {
        rowErrors.push({ rowNumber: previewRow.rowNumber, message: stageResult.error ?? 'Invalid stage.' });
        continue;
      }

      const contact = LeadContactService.normalizeForPersistence({
        phone: previewRow.phone ?? undefined,
        email: previewRow.email,
      });

      let tagIds: string[] = [];
      if (source.tags?.length) {
        const resolved = await this.resolveTagIdsByNames(organizationId, source.tags);
        if (resolved.missing.length > 0) {
          rowErrors.push({
            rowNumber: previewRow.rowNumber,
            message: `Unknown tag(s): ${resolved.missing.join(', ')}.`,
          });
          continue;
        }
        tagIds = resolved.tagIds;
      }

      const leadId = crypto.randomUUID();
      try {
        await this.prisma.$transaction(async (tx) => {
          const seq = await nextSequence(tx, organizationId, SEQUENCE_KEYS.lead);
          const referenceNumber = formatReference('LD', seq);
          const kanbanSortOrder = await nextKanbanSortOrder(tx, organizationId, stageResult.stageId!);
          const tagNames =
            tagIds.length > 0
              ? (
                  await tx.leadTag.findMany({
                    where: { id: { in: tagIds } },
                    select: { name: true },
                  })
                ).map((tag) => tag.name)
              : [];

          await tx.lead.create({
            data: {
              id: leadId,
              organizationId,
              referenceNumber,
              fullName: previewRow.fullName,
              companyName: '',
              email: contact.email ?? null,
              phone: contact.phone ?? null,
              website: null,
              source: (source.source as 'OTHER') ?? 'OTHER',
              pipelineId,
              stageId: stageResult.stageId!,
              priority: (source.priority as 'MEDIUM') ?? 'MEDIUM',
              estimatedValue: new Decimal(parseLeadImportEstimatedValue(source.estimatedValue)),
              currency: 'INR',
              description: source.description?.trim() ?? '',
              tags: tagNames,
              kanbanSortOrder,
              createdByAdminId: adminId,
            },
          });

          if (tagIds.length > 0) {
            await tx.leadTagAssignment.createMany({
              data: tagIds.map((tagId) => ({ leadId, tagId })),
              skipDuplicates: true,
            });
          }

          await tx.leadActivity.create({
            data: {
              id: crypto.randomUUID(),
              organizationId,
              leadId,
              type: 'NOTE',
              title: 'Lead imported',
              description: '',
              occurredAt: new Date(),
              createdByAdminId: adminId,
            },
          });

          await writeAudit(tx, organizationId, { ...audit, entityId: leadId });
        });
        importedLeadIds.push(leadId);
      } catch (caught: unknown) {
        try {
          rethrowLeadContactUniqueViolation(caught);
        } catch (failure) {
          const message =
            failure instanceof Error ? failure.message : 'Import failed for this row.';
          rowErrors.push({ rowNumber: previewRow.rowNumber, message });
        }
      }
    }

    return {
      importedCount: importedLeadIds.length,
      existingCount: preview.existingCount,
      duplicateCount: preview.duplicateInFileCount,
      failedCount: rowErrors.length,
      importedLeadIds,
      rowErrors,
    };
  }
}
