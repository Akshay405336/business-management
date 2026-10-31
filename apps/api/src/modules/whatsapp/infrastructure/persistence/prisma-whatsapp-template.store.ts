import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { WhatsAppTemplateSummary } from '@techwin/contracts';
import type { WhatsAppTemplateListQuery } from '@techwin/validation';
import type { Prisma, WhatsAppTemplate } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import type { ProviderTemplate } from '../../domain/whatsapp.ports.js';
import { describeTemplate } from '../../domain/whatsapp-template.js';
import { recordAudit, toJson } from './whatsapp-persistence.shared.js';

type TemplateRow = WhatsAppTemplate & {
  channel: { name: string; deletedAt: Date | null; disconnectedAt: Date | null };
};

function toSummary(row: TemplateRow): WhatsAppTemplateSummary {
  const description = describeTemplate(row.components);
  const channelActive = !row.channel.deletedAt && !row.channel.disconnectedAt;
  return {
    id: row.id,
    channelId: row.channelId,
    channelName: row.channel.name,
    providerTemplateId: row.providerTemplateId,
    name: row.name,
    language: row.language,
    category: row.category,
    status: row.status,
    rejectedReason: row.rejectedReason,
    qualityScore: row.qualityScore,
    bodyText: description.bodyText,
    headerText: description.headerText,
    footerText: description.footerText,
    buttons: description.buttons,
    parameters: description.parameters.map(({ component, index, name }) => ({
      component,
      index,
      name,
    })),
    sendable: row.status === 'APPROVED' && description.supported && channelActive,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
  };
}

const channelSelect = { select: { name: true, deletedAt: true, disconnectedAt: true } } as const;

@Injectable()
export class PrismaWhatsAppTemplateStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private dataFor(template: ProviderTemplate) {
    const description = describeTemplate(template.components);
    return {
      providerTemplateId: template.id.slice(0, 64),
      category: template.category.slice(0, 32),
      status: template.status.slice(0, 32),
      rejectedReason: template.rejectedReason?.slice(0, 255) ?? null,
      qualityScore: template.qualityScore?.slice(0, 32) ?? null,
      components: toJson(template.components) as Prisma.InputJsonValue,
      bodyText: description.bodyText,
      variableCount: description.parameters.length,
    };
  }

  /** Mirrors Meta's list. Templates no longer returned by Meta are kept (history) but marked DELETED. */
  async replaceSynced(
    organizationId: string,
    channelId: string,
    templates: readonly ProviderTemplate[],
    at: Date,
  ): Promise<{ synced: number; removed: number }> {
    return this.prisma.$transaction(async (tx) => {
      const seen: string[] = [];
      for (const template of templates) {
        const data = { ...this.dataFor(template), lastSyncedAt: at };
        const saved = await tx.whatsAppTemplate.upsert({
          where: {
            channelId_name_language: {
              channelId,
              name: template.name.slice(0, 512),
              language: template.language.slice(0, 16),
            },
          },
          create: {
            id: randomUUID(),
            organizationId,
            channelId,
            name: template.name.slice(0, 512),
            language: template.language.slice(0, 16),
            ...data,
          },
          update: data,
          select: { id: true },
        });
        seen.push(saved.id);
      }
      const removed = await tx.whatsAppTemplate.updateMany({
        where: { organizationId, channelId, id: { notIn: seen }, status: { not: 'DELETED' } },
        data: { status: 'DELETED', lastSyncedAt: at },
      });
      await recordAudit(tx, {
        organizationId,
        adminId: null,
        type: 'WHATSAPP_TEMPLATES_SYNCED',
        entityType: 'whatsapp_channel',
        entityId: channelId,
        metadata: { synced: templates.length, removed: removed.count },
      });
      return { synced: templates.length, removed: removed.count };
    });
  }

  async list(
    organizationId: string,
    query: WhatsAppTemplateListQuery,
  ): Promise<readonly WhatsAppTemplateSummary[]> {
    const rows = await this.prisma.whatsAppTemplate.findMany({
      where: {
        organizationId,
        channel: { deletedAt: null },
        ...(query.channelId ? { channelId: query.channelId } : {}),
        ...(query.status ? { status: query.status.toUpperCase() } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' as const } },
                { bodyText: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { channel: channelSelect },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toSummary);
  }

  async get(organizationId: string, id: string): Promise<WhatsAppTemplateSummary | null> {
    const row = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, organizationId },
      include: { channel: channelSelect },
    });
    return row ? toSummary(row) : null;
  }

  async getForSend(
    organizationId: string,
    id: string,
  ): Promise<{ summary: WhatsAppTemplateSummary; components: unknown } | null> {
    const row = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, organizationId },
      include: { channel: channelSelect },
    });
    return row ? { summary: toSummary(row), components: row.components } : null;
  }

  async recordSubmitted(
    organizationId: string,
    adminId: string,
    channelId: string,
    template: ProviderTemplate,
  ): Promise<WhatsAppTemplateSummary> {
    const row = await this.prisma.$transaction(async (tx) => {
      const data = this.dataFor(template);
      const saved = await tx.whatsAppTemplate.upsert({
        where: {
          channelId_name_language: { channelId, name: template.name, language: template.language },
        },
        create: {
          id: randomUUID(),
          organizationId,
          channelId,
          name: template.name,
          language: template.language,
          ...data,
        },
        update: data,
        include: { channel: channelSelect },
      });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_TEMPLATE_SUBMITTED',
        entityType: 'whatsapp_template',
        entityId: saved.id,
        metadata: {
          name: template.name,
          language: template.language,
          category: template.category,
          status: template.status,
        },
      });
      return saved;
    });
    return toSummary(row);
  }
}
