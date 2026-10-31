import { Inject, Injectable } from '@nestjs/common';
import type { WhatsAppAnalyticsResponse } from '@techwin/contracts';
import type { WhatsAppAnalyticsQuery } from '@techwin/validation';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveRange(query: WhatsAppAnalyticsQuery): { from: Date; to: Date } {
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const from = query.from
    ? new Date(`${query.from}T00:00:00.000Z`)
    : new Date(to.getTime() - 30 * DAY_MS);
  return { from, to };
}

@Injectable()
export class PrismaWhatsAppAnalyticsStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async summary(
    organizationId: string,
    query: WhatsAppAnalyticsQuery,
  ): Promise<WhatsAppAnalyticsResponse> {
    const { from, to } = resolveRange(query);
    const channel = query.channelId ? { channelId: query.channelId } : {};
    const inRange = { gte: from, lte: to };
    const messageWhere = { organizationId, ...channel, createdAt: inRange };

    const [
      inbound,
      outbound,
      delivered,
      read,
      failed,
      started,
      resolved,
      open,
      unassigned,
      firstResponse,
      byChannelRaw,
      assignedRaw,
      resolvedRaw,
      broadcasts,
      recipientGroups,
    ] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where: { ...messageWhere, direction: 'INBOUND' } }),
      this.prisma.whatsAppMessage.count({ where: { ...messageWhere, direction: 'OUTBOUND' } }),
      this.prisma.whatsAppMessage.count({
        where: { ...messageWhere, direction: 'OUTBOUND', status: { in: ['DELIVERED', 'READ'] } },
      }),
      this.prisma.whatsAppMessage.count({
        where: { ...messageWhere, direction: 'OUTBOUND', status: 'READ' },
      }),
      this.prisma.whatsAppMessage.count({
        where: { ...messageWhere, direction: 'OUTBOUND', status: 'FAILED' },
      }),
      this.prisma.whatsAppConversation.count({
        where: { organizationId, ...channel, createdAt: inRange },
      }),
      this.prisma.whatsAppConversation.count({
        where: { organizationId, ...channel, resolvedAt: inRange },
      }),
      this.prisma.whatsAppConversation.count({
        where: { organizationId, ...channel, status: { in: ['NEW', 'OPEN'] } },
      }),
      this.prisma.whatsAppConversation.count({
        where: {
          organizationId,
          ...channel,
          status: { in: ['NEW', 'OPEN'] },
          assignedEmployeeId: null,
        },
      }),
      this.prisma.$queryRaw<{ avg: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)))::float8 AS avg
        FROM whatsapp_conversations
        WHERE organization_id = ${organizationId}::uuid
          AND first_response_at IS NOT NULL
          AND created_at BETWEEN ${from} AND ${to}
          ${query.channelId ? Prisma.sql`AND channel_id = ${query.channelId}::uuid` : Prisma.empty}`,
      this.prisma.whatsAppMessage.groupBy({
        by: ['channelId', 'direction'],
        where: messageWhere,
        _count: { _all: true },
      }),
      this.prisma.whatsAppConversation.groupBy({
        by: ['assignedEmployeeId'],
        where: {
          organizationId,
          ...channel,
          assignedEmployeeId: { not: null },
          status: { in: ['NEW', 'OPEN'] },
        },
        _count: { _all: true },
      }),
      this.prisma.whatsAppConversation.groupBy({
        by: ['assignedEmployeeId'],
        where: {
          organizationId,
          ...channel,
          assignedEmployeeId: { not: null },
          resolvedAt: inRange,
        },
        _count: { _all: true },
      }),
      this.prisma.whatsAppBroadcast.count({
        where: { organizationId, ...channel, createdAt: inRange },
      }),
      this.prisma.whatsAppBroadcastRecipient.groupBy({
        by: ['status'],
        where: { organizationId, broadcast: { createdAt: inRange, ...channel } },
        _count: { _all: true },
      }),
    ]);

    const channelIds = [...new Set(byChannelRaw.map((row) => row.channelId))];
    const employeeIds = [
      ...new Set(
        [...assignedRaw, ...resolvedRaw]
          .map((row) => row.assignedEmployeeId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const [channels, employees] = await Promise.all([
      this.prisma.whatsAppChannel.findMany({
        where: { id: { in: channelIds } },
        select: { id: true, name: true },
      }),
      this.prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, displayName: true },
      }),
    ]);
    const channelNames = new Map(channels.map((row) => [row.id, row.name]));
    const employeeNames = new Map(employees.map((row) => [row.id, row.displayName]));

    const byChannel = channelIds.map((channelId) => ({
      channelId,
      channelName: channelNames.get(channelId) ?? 'Channel',
      inbound:
        byChannelRaw.find((row) => row.channelId === channelId && row.direction === 'INBOUND')
          ?._count._all ?? 0,
      outbound:
        byChannelRaw.find((row) => row.channelId === channelId && row.direction === 'OUTBOUND')
          ?._count._all ?? 0,
    }));
    const byAgent = employeeIds
      .map((employeeId) => ({
        employeeId,
        displayName: employeeNames.get(employeeId) ?? 'Employee',
        assigned:
          assignedRaw.find((row) => row.assignedEmployeeId === employeeId)?._count._all ?? 0,
        resolved:
          resolvedRaw.find((row) => row.assignedEmployeeId === employeeId)?._count._all ?? 0,
      }))
      .sort((a, b) => b.resolved + b.assigned - (a.resolved + a.assigned));

    const recipients = recipientGroups.reduce((sum, group) => sum + group._count._all, 0);
    const failedRecipients =
      recipientGroups.find((group) => group.status === 'FAILED')?._count._all ?? 0;
    const average = firstResponse[0]?.avg;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      messages: { inbound, outbound, delivered, read, failed },
      conversations: {
        started,
        resolved,
        open,
        unassigned,
        averageFirstResponseSeconds: typeof average === 'number' ? Math.round(average) : null,
      },
      byChannel,
      byAgent,
      broadcasts: { total: broadcasts, recipients, failed: failedRecipients },
    };
  }
}
