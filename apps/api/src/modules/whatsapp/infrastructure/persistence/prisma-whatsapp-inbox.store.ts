import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  WhatsAppAssigneeSummary,
  WhatsAppFolderCounts,
  WhatsAppInboxFolder,
  WhatsAppRealtimeEvent,
  WhatsAppTimelineItem,
  WhatsAppTimelineResponse,
} from '@techwin/contracts';
import type { WhatsAppConversationListQuery, WhatsAppTimelineQuery } from '@techwin/validation';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { WhatsAppNotFoundError, WhatsAppValidationError } from '../../domain/whatsapp.errors.js';
import { toE164 } from '../../domain/whatsapp-phone.js';
import {
  adminNameMap,
  conversationInclude,
  employeeSelect,
  findCrmPhoneMatches,
  recordAudit,
  recordConversationEvent,
  toAssignee,
  toConversationSummary,
  toMessageView,
} from './whatsapp-persistence.shared.js';

type Scope = { canViewAll: boolean; employeeId: string | null };

const TIMELINE_EVENT_TYPES = [
  'NOTE_ADDED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'CONTACT_UPDATED',
] as const;
const ACTIVE_STATUSES = ['NEW', 'OPEN'] as const;

function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime()) || !id) return null;
  return { at, id };
}

function scopeWhere(scope: Scope): Prisma.WhatsAppConversationWhereInput {
  if (scope.canViewAll) return {};
  return {
    OR: [
      { assignedEmployeeId: null },
      ...(scope.employeeId ? [{ assignedEmployeeId: scope.employeeId }] : []),
    ],
  };
}

function folderWhere(
  folder: WhatsAppInboxFolder,
  scope: Scope,
): Prisma.WhatsAppConversationWhereInput {
  switch (folder) {
    case 'new':
      return { status: 'NEW' };
    case 'open':
      return { status: 'OPEN' };
    case 'resolved':
      return { status: 'RESOLVED' };
    case 'spam':
      return { status: 'SPAM' };
    case 'mine':
      return scope.employeeId
        ? { assignedEmployeeId: scope.employeeId, status: { in: [...ACTIVE_STATUSES] } }
        : { id: { in: [] } };
    case 'unassigned':
      return { assignedEmployeeId: null, status: { in: [...ACTIVE_STATUSES] } };
    default:
      return { status: { not: 'SPAM' } };
  }
}

@Injectable()
export class PrismaWhatsAppInboxStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findFirst({
      where: { organizationId, platformAdminId: adminId },
      select: { id: true },
    });
    return employee?.id ?? null;
  }

  async listConversations(
    organizationId: string,
    scope: Scope,
    query: WhatsAppConversationListQuery,
  ) {
    const cursor = decodeCursor(query.cursor);
    const search = query.search?.trim();
    const digits = search?.replace(/\D/g, '') ?? '';
    const where: Prisma.WhatsAppConversationWhereInput = {
      organizationId,
      AND: [
        scopeWhere(scope),
        folderWhere(query.folder, scope),
        query.channelId ? { channelId: query.channelId } : {},
        query.assigneeId ? { assignedEmployeeId: query.assigneeId } : {},
        search
          ? {
              OR: [
                { contact: { profileName: { contains: search, mode: 'insensitive' } } },
                ...(digits.length >= 3 ? [{ contact: { waId: { contains: digits } } }] : []),
                { contact: { lead: { fullName: { contains: search, mode: 'insensitive' } } } },
                { contact: { client: { name: { contains: search, mode: 'insensitive' } } } },
                { lastMessagePreview: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        cursor
          ? {
              OR: [
                { lastMessageAt: { lt: cursor.at } },
                { lastMessageAt: cursor.at, id: { lt: cursor.id } },
              ],
            }
          : {},
      ],
    };
    const rows = await this.prisma.whatsAppConversation.findMany({
      where,
      include: conversationInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => toConversationSummary(row)),
      nextCursor:
        rows.length > query.limit && last ? encodeCursor(last.lastMessageAt, last.id) : null,
    };
  }

  async folderCounts(organizationId: string, scope: Scope): Promise<WhatsAppFolderCounts> {
    const folders: WhatsAppInboxFolder[] = [
      'all',
      'new',
      'open',
      'resolved',
      'spam',
      'mine',
      'unassigned',
    ];
    const counts = await Promise.all(
      folders.map((folder) =>
        this.prisma.whatsAppConversation.count({
          where: { organizationId, AND: [scopeWhere(scope), folderWhere(folder, scope)] },
        }),
      ),
    );
    return Object.fromEntries(
      folders.map((folder, index) => [folder, counts[index] ?? 0]),
    ) as Record<WhatsAppInboxFolder, number>;
  }

  async getConversation(organizationId: string, id: string) {
    const row = await this.prisma.whatsAppConversation.findFirst({
      where: { id, organizationId },
      include: conversationInclude,
    });
    if (!row) return null;
    const [matches, lastInbound] = await Promise.all([
      findCrmPhoneMatches(this.prisma, organizationId, row.contact.waId),
      this.prisma.whatsAppMessage.findFirst({
        where: { conversationId: id, direction: 'INBOUND' },
        orderBy: { createdAt: 'desc' },
        select: { providerMessageId: true },
      }),
    ]);
    const linked = new Set([row.contact.leadId, row.contact.clientId]);
    const crmMatches = [...matches.clients, ...matches.leads].filter(
      (match) => !linked.has(match.id),
    );
    return {
      summary: toConversationSummary(row, crmMatches),
      channelId: row.channelId,
      contactId: row.contactId,
      contactWaId: row.contact.waId,
      consentStatus: row.contact.consentStatus,
      assignedEmployeeId: row.assignedEmployeeId,
      lastInboundAt: row.lastInboundAt,
      status: row.status,
      lastInboundProviderMessageId: lastInbound?.providerMessageId ?? null,
    };
  }

  async timeline(
    organizationId: string,
    conversationId: string,
    query: WhatsAppTimelineQuery,
  ): Promise<WhatsAppTimelineResponse> {
    const before = query.before ? new Date(query.before) : null;
    const createdBefore = before && !Number.isNaN(before.getTime()) ? { lt: before } : undefined;
    const [messages, events] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        where: {
          organizationId,
          conversationId,
          ...(createdBefore ? { createdAt: createdBefore } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      this.prisma.whatsAppConversationEvent.findMany({
        where: {
          organizationId,
          conversationId,
          type: { in: [...TIMELINE_EVENT_TYPES] },
          ...(createdBefore ? { createdAt: createdBefore } : {}),
        },
        orderBy: { id: 'desc' },
        take: query.limit,
      }),
    ]);
    const [admins, templates] = await Promise.all([
      adminNameMap(this.prisma, [
        ...messages.map((message) => message.sentByAdminId),
        ...events.map((event) => event.actorAdminId),
      ]),
      this.templateNames(messages.map((message) => message.templateId)),
    ]);
    const items: WhatsAppTimelineItem[] = [
      ...messages.map((message) => ({
        kind: 'message' as const,
        at: message.createdAt.toISOString(),
        message: toMessageView(message, admins, templates),
      })),
      ...events.map((event) => ({
        kind: 'event' as const,
        at: event.createdAt.toISOString(),
        event: {
          id: event.id.toString(),
          type: event.type as (typeof TIMELINE_EVENT_TYPES)[number],
          body: event.body,
          metadata: event.metadata ?? null,
          actor: event.actorAdminId
            ? { adminId: event.actorAdminId, name: admins.get(event.actorAdminId) ?? 'Team member' }
            : null,
          createdAt: event.createdAt.toISOString(),
        },
      })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, query.limit)
      .reverse();
    const hasMore = messages.length === query.limit || events.length === query.limit;
    return { items, olderCursor: hasMore && items[0] ? items[0].at : null };
  }

  private async templateNames(ids: Iterable<string | null>): Promise<Map<string, string>> {
    const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.whatsAppTemplate.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((row) => [row.id, row.name]));
  }

  async getMessageView(organizationId: string, messageId: string) {
    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { id: messageId, organizationId },
    });
    if (!message) return null;
    const [admins, templates] = await Promise.all([
      adminNameMap(this.prisma, [message.sentByAdminId]),
      this.templateNames([message.templateId]),
    ]);
    return toMessageView(message, admins, templates);
  }

  private async conversationOrThrow(organizationId: string, conversationId: string) {
    const conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { assignedEmployee: { select: { id: true, displayName: true } } },
    });
    if (!conversation) throw new WhatsAppNotFoundError('Conversation');
    return conversation;
  }

  async addNote(
    organizationId: string,
    conversationId: string,
    adminId: string,
    body: string,
  ): Promise<void> {
    const conversation = await this.conversationOrThrow(organizationId, conversationId);
    await this.prisma.$transaction((tx) =>
      recordConversationEvent(tx, {
        organizationId,
        channelId: conversation.channelId,
        conversationId,
        type: 'NOTE_ADDED',
        actorAdminId: adminId,
        body,
      }),
    );
  }

  async isAssignableEmployee(organizationId: string, employeeId: string): Promise<boolean> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        organizationId,
        employmentStatus: 'ACTIVE',
        platformAdmin: { memberships: { some: { organizationId, status: 'ACTIVE' } } },
      },
      select: { id: true },
    });
    return employee !== null;
  }

  async assign(
    organizationId: string,
    conversationId: string,
    adminId: string,
    employeeId: string | null,
    reason: string | null,
  ): Promise<boolean> {
    const conversation = await this.conversationOrThrow(organizationId, conversationId);
    if (conversation.assignedEmployeeId === employeeId) return false;
    const next = employeeId
      ? await this.prisma.employee.findFirst({
          where: { id: employeeId, organizationId },
          select: { id: true, displayName: true },
        })
      : null;
    if (employeeId && !next) throw new WhatsAppValidationError('Choose an active employee.');
    const metadata = {
      from: conversation.assignedEmployee
        ? { id: conversation.assignedEmployee.id, name: conversation.assignedEmployee.displayName }
        : null,
      to: next ? { id: next.id, name: next.displayName } : null,
      reason: reason || null,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppConversation.update({
        where: { id: conversationId },
        data: { assignedEmployeeId: employeeId },
      });
      await recordConversationEvent(tx, {
        organizationId,
        channelId: conversation.channelId,
        conversationId,
        type: 'ASSIGNED',
        actorAdminId: adminId,
        metadata,
      });
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CONVERSATION_ASSIGNED',
        entityType: 'whatsapp_conversation',
        entityId: conversationId,
        metadata: {
          fromEmployeeId: metadata.from?.id ?? null,
          toEmployeeId: metadata.to?.id ?? null,
        },
      });
    });
    return true;
  }

  async setStatus(
    organizationId: string,
    conversationId: string,
    adminId: string,
    status: 'OPEN' | 'RESOLVED' | 'SPAM',
  ): Promise<boolean> {
    const conversation = await this.conversationOrThrow(organizationId, conversationId);
    if (conversation.status === status) return false;
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppConversation.update({
        where: { id: conversationId },
        data: {
          status,
          ...(status === 'RESOLVED'
            ? { resolvedAt: new Date(), resolvedByAdminId: adminId, unreadCount: 0 }
            : { resolvedAt: null, resolvedByAdminId: null }),
          ...(status === 'SPAM' ? { unreadCount: 0 } : {}),
        },
      });
      await recordConversationEvent(tx, {
        organizationId,
        channelId: conversation.channelId,
        conversationId,
        type: 'STATUS_CHANGED',
        actorAdminId: adminId,
        metadata: { from: conversation.status, to: status },
      });
    });
    return true;
  }

  async markRead(organizationId: string, conversationId: string): Promise<boolean> {
    const result = await this.prisma.whatsAppConversation.updateMany({
      where: { id: conversationId, organizationId, unreadCount: { gt: 0 } },
      data: { unreadCount: 0 },
    });
    return result.count > 0;
  }

  private async contactOrThrow(organizationId: string, contactId: string) {
    const contact = await this.prisma.whatsAppContact.findFirst({
      where: { id: contactId, organizationId },
      include: { conversations: { select: { id: true, channelId: true } } },
    });
    if (!contact) throw new WhatsAppNotFoundError('Contact');
    return contact;
  }

  async setConsent(
    organizationId: string,
    contactId: string,
    adminId: string,
    status: 'OPTED_IN' | 'OPTED_OUT',
    source: string,
  ): Promise<void> {
    const contact = await this.contactOrThrow(organizationId, contactId);
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppContact.update({
        where: { id: contactId },
        data: {
          consentStatus: status,
          consentSource: source,
          consentUpdatedAt: new Date(),
          consentUpdatedByAdminId: adminId,
        },
      });
      for (const conversation of contact.conversations) {
        await recordConversationEvent(tx, {
          organizationId,
          channelId: conversation.channelId,
          conversationId: conversation.id,
          type: 'CONTACT_UPDATED',
          actorAdminId: adminId,
          metadata: { consent: { from: contact.consentStatus, to: status }, source },
        });
      }
      await recordAudit(tx, {
        organizationId,
        adminId,
        type: 'WHATSAPP_CONTACT_CONSENT_CHANGED',
        entityType: 'whatsapp_contact',
        entityId: contactId,
        metadata: { from: contact.consentStatus, to: status, source },
      });
    });
  }

  private async assertCrmRecord(
    organizationId: string,
    kind: 'LEAD' | 'CLIENT',
    id: string,
  ): Promise<void> {
    const found =
      kind === 'LEAD'
        ? await this.prisma.lead.findFirst({
            where: { id, organizationId, archivedAt: null },
            select: { id: true },
          })
        : await this.prisma.client.findFirst({
            where: { id, organizationId, archivedAt: null },
            select: { id: true },
          });
    if (!found)
      throw new WhatsAppValidationError(kind === 'LEAD' ? 'Lead not found.' : 'Client not found.');
  }

  async setCrmLink(
    organizationId: string,
    contactId: string,
    adminId: string,
    kind: 'LEAD' | 'CLIENT',
    recordId: string | null,
  ): Promise<void> {
    const contact = await this.contactOrThrow(organizationId, contactId);
    if (recordId) await this.assertCrmRecord(organizationId, kind, recordId);
    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppContact.update({
        where: { id: contactId },
        data: kind === 'LEAD' ? { leadId: recordId } : { clientId: recordId },
      });
      for (const conversation of contact.conversations) {
        await recordConversationEvent(tx, {
          organizationId,
          channelId: conversation.channelId,
          conversationId: conversation.id,
          type: 'CONTACT_UPDATED',
          actorAdminId: adminId,
          metadata: { crmLink: { kind, id: recordId } },
        });
      }
    });
  }

  async startConversation(input: {
    organizationId: string;
    adminId: string;
    channelId: string;
    waId: string;
    profileName: string;
    leadId: string | null;
    clientId: string | null;
  }): Promise<{ conversationId: string }> {
    const channel = await this.prisma.whatsAppChannel.findFirst({
      where: {
        id: input.channelId,
        organizationId: input.organizationId,
        deletedAt: null,
        disconnectedAt: null,
      },
      select: { id: true },
    });
    if (!channel) throw new WhatsAppValidationError('Choose a connected WhatsApp channel.');
    if (input.leadId) await this.assertCrmRecord(input.organizationId, 'LEAD', input.leadId);
    if (input.clientId) await this.assertCrmRecord(input.organizationId, 'CLIENT', input.clientId);

    return this.prisma.$transaction(async (tx) => {
      let contact = await tx.whatsAppContact.findUnique({
        where: { organizationId_waId: { organizationId: input.organizationId, waId: input.waId } },
      });
      if (!contact) {
        contact = await tx.whatsAppContact.create({
          data: {
            id: randomUUID(),
            organizationId: input.organizationId,
            waId: input.waId,
            phoneE164: toE164(input.waId),
            profileName: input.profileName,
            leadId: input.leadId,
            clientId: input.clientId,
          },
        });
      } else if ((input.leadId && !contact.leadId) || (input.clientId && !contact.clientId)) {
        contact = await tx.whatsAppContact.update({
          where: { id: contact.id },
          data: {
            ...(input.leadId && !contact.leadId ? { leadId: input.leadId } : {}),
            ...(input.clientId && !contact.clientId ? { clientId: input.clientId } : {}),
          },
        });
      }
      const existing = await tx.whatsAppConversation.findUnique({
        where: { channelId_contactId: { channelId: input.channelId, contactId: contact.id } },
        select: { id: true },
      });
      if (existing) return { conversationId: existing.id };
      const conversationId = randomUUID();
      await tx.whatsAppConversation.create({
        data: {
          id: conversationId,
          organizationId: input.organizationId,
          channelId: input.channelId,
          contactId: contact.id,
          status: 'OPEN',
        },
      });
      await recordConversationEvent(tx, {
        organizationId: input.organizationId,
        channelId: input.channelId,
        conversationId,
        type: 'CONVERSATION_CREATED',
        actorAdminId: input.adminId,
      });
      return { conversationId };
    });
  }

  async listAssignees(organizationId: string): Promise<readonly WhatsAppAssigneeSummary[]> {
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        employmentStatus: 'ACTIVE',
        platformAdmin: { memberships: { some: { organizationId, status: 'ACTIVE' } } },
      },
      select: employeeSelect,
      orderBy: { displayName: 'asc' },
    });
    return employees.map(toAssignee);
  }

  async latestEventCursor(organizationId: string): Promise<bigint> {
    const latest = await this.prisma.whatsAppConversationEvent.findFirst({
      where: { organizationId },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    return latest?.id ?? 0n;
  }

  async eventsAfter(organizationId: string, scope: Scope, after: bigint, limit: number) {
    const rows = await this.prisma.whatsAppConversationEvent.findMany({
      where: { organizationId, id: { gt: after } },
      orderBy: { id: 'asc' },
      take: limit,
      include: { conversation: { select: { assignedEmployeeId: true } } },
    });
    const visible = rows.filter((row) => {
      if (scope.canViewAll) return true;
      const assignee = row.conversation.assignedEmployeeId;
      if (assignee === null || assignee === scope.employeeId) return true;
      const from = (row.metadata as { from?: { id?: string } } | null)?.from?.id;
      return row.type === 'ASSIGNED' && from !== undefined && from === scope.employeeId;
    });
    const events: WhatsAppRealtimeEvent[] = visible.map((row) => ({
      cursor: row.id.toString(),
      type: row.type,
      conversationId: row.conversationId,
      messageId: row.messageId,
      createdAt: row.createdAt.toISOString(),
    }));
    return { events, lastScanned: rows.at(-1)?.id ?? after };
  }
}
