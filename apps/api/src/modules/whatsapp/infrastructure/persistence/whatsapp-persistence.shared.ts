import {
  EMPLOYEE_ROUTES,
  WHATSAPP_ROUTES,
  type WhatsAppAssigneeSummary,
  type WhatsAppConversationSummary,
  type WhatsAppCrmLink,
  type WhatsAppMessageView,
} from '@techwin/contracts';
import {
  Prisma,
  type CrmAuditEventType,
  type WhatsAppConversationEventType,
  type WhatsAppMessage,
} from '../../../../generated/prisma/client.js';
import { CRM_PHONE_MATCH_DIGITS, crmPhoneMatchKey } from '../../domain/whatsapp-phone.js';
import { serviceWindowEndsAt } from '../../domain/whatsapp-policy.js';

export type Tx = Prisma.TransactionClient;

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : value;
}

export async function recordConversationEvent(
  tx: Tx,
  input: {
    organizationId: string;
    channelId: string;
    conversationId: string;
    type: WhatsAppConversationEventType;
    messageId?: string | null;
    actorAdminId?: string | null;
    body?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await tx.whatsAppConversationEvent.create({
    data: {
      organizationId: input.organizationId,
      channelId: input.channelId,
      conversationId: input.conversationId,
      type: input.type,
      messageId: input.messageId ?? null,
      actorAdminId: input.actorAdminId ?? null,
      body: input.body ?? null,
      metadata: toJson(input.metadata ?? null),
    },
  });
}

/** Audit trail entry. Metadata must never contain credentials or message content. */
export async function recordAudit(
  tx: Tx,
  input: {
    organizationId: string;
    adminId: string | null;
    type: CrmAuditEventType;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.crmAuditEvent.create({
    data: {
      organizationId: input.organizationId,
      adminId: input.adminId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: toJson(input.metadata ?? null),
    },
  });
}

export const employeeSelect = {
  id: true,
  displayName: true,
  jobTitle: true,
  profileImageUrl: true,
  profileImageStoredObjectId: true,
} as const satisfies Prisma.EmployeeSelect;

export type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

export function toAssignee(employee: EmployeeRow): WhatsAppAssigneeSummary {
  return {
    employeeId: employee.id,
    displayName: employee.displayName,
    jobTitle: employee.jobTitle,
    profileImageUrl: employee.profileImageStoredObjectId
      ? EMPLOYEE_ROUTES.employeeStoredProfileImageContent(employee.profileImageStoredObjectId)
      : employee.profileImageUrl,
  };
}

export const conversationInclude = {
  channel: { select: { id: true, name: true } },
  contact: {
    include: {
      lead: { select: { id: true, fullName: true, referenceNumber: true } },
      client: { select: { id: true, name: true, referenceNumber: true } },
    },
  },
  assignedEmployee: { select: employeeSelect },
} as const satisfies Prisma.WhatsAppConversationInclude;

export type ConversationRow = Prisma.WhatsAppConversationGetPayload<{
  include: typeof conversationInclude;
}>;

type ContactRow = ConversationRow['contact'];

export function crmLinksOf(contact: ContactRow): WhatsAppCrmLink[] {
  const links: WhatsAppCrmLink[] = [];
  if (contact.lead) {
    links.push({
      kind: 'LEAD',
      id: contact.lead.id,
      name: contact.lead.fullName,
      referenceNumber: contact.lead.referenceNumber,
    });
  }
  if (contact.client) {
    links.push({
      kind: 'CLIENT',
      id: contact.client.id,
      name: contact.client.name,
      referenceNumber: contact.client.referenceNumber,
    });
  }
  return links;
}

export function contactDisplayName(contact: ContactRow): string {
  return contact.client?.name || contact.lead?.fullName || contact.profileName || contact.phoneE164;
}

export function toConversationSummary(
  row: ConversationRow,
  crmMatches: readonly WhatsAppCrmLink[] = [],
): WhatsAppConversationSummary {
  const windowEnd = serviceWindowEndsAt(row.lastInboundAt);
  return {
    id: row.id,
    channelId: row.channelId,
    channelName: row.channel.name,
    status: row.status,
    contact: {
      id: row.contact.id,
      waId: row.contact.waId,
      phoneE164: row.contact.phoneE164,
      profileName: row.contact.profileName,
      displayName: contactDisplayName(row.contact),
      consentStatus: row.contact.consentStatus,
      consentSource: row.contact.consentSource,
      consentUpdatedAt: row.contact.consentUpdatedAt?.toISOString() ?? null,
      crmLinks: crmLinksOf(row.contact),
      crmMatches,
    },
    assignee: row.assignedEmployee ? toAssignee(row.assignedEmployee) : null,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessagePreview: row.lastMessagePreview,
    lastMessageDirection: row.lastMessageDirection,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    serviceWindowEndsAt: windowEnd?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toMessageView(
  row: WhatsAppMessage,
  adminNames: ReadonlyMap<string, string>,
  templateNames: ReadonlyMap<string, string>,
): WhatsAppMessageView {
  return {
    id: row.id,
    conversationId: row.conversationId,
    direction: row.direction,
    type: row.type,
    status: row.status,
    body: row.body,
    payload: row.payload ?? null,
    media:
      row.mediaStatus === 'NONE'
        ? null
        : {
            status: row.mediaStatus,
            mimeType: row.mediaMimeType,
            fileName: row.mediaFileName,
            sizeBytes: row.mediaSizeBytes,
            url:
              row.mediaStatus === 'READY' && row.mediaStoredObjectId
                ? WHATSAPP_ROUTES.messageMedia(row.id)
                : null,
          },
    templateName: row.templateId ? (templateNames.get(row.templateId) ?? null) : null,
    sentBy: row.sentByAdminId
      ? { adminId: row.sentByAdminId, name: adminNames.get(row.sentByAdminId) ?? 'Team member' }
      : null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    sentAt: row.sentAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * CRM records whose stored phone ends with the same national number. CRM phones
 * are free-form, so both sides are reduced to digits before comparing.
 */
const NON_DIGITS = '\\D';

export async function findCrmPhoneMatches(
  tx: Pick<Tx, '$queryRaw'>,
  organizationId: string,
  waId: string,
): Promise<{ leads: WhatsAppCrmLink[]; clients: WhatsAppCrmLink[] }> {
  const key = crmPhoneMatchKey(waId);
  if (!key) return { leads: [], clients: [] };
  const [leads, clients] = await Promise.all([
    tx.$queryRaw<{ id: string; name: string; reference_number: string }[]>`
      SELECT id, full_name AS name, reference_number FROM leads
      WHERE organization_id = ${organizationId}::uuid AND archived_at IS NULL AND phone IS NOT NULL
        AND right(regexp_replace(phone, ${NON_DIGITS}, '', 'g'), ${CRM_PHONE_MATCH_DIGITS}::int) = ${key}
      ORDER BY created_at DESC LIMIT 5`,
    tx.$queryRaw<{ id: string; name: string; reference_number: string }[]>`
      SELECT id, name, reference_number FROM clients
      WHERE organization_id = ${organizationId}::uuid AND archived_at IS NULL AND phone IS NOT NULL
        AND right(regexp_replace(phone, ${NON_DIGITS}, '', 'g'), ${CRM_PHONE_MATCH_DIGITS}::int) = ${key}
      ORDER BY created_at DESC LIMIT 5`,
  ]);
  return {
    leads: leads.map((row) => ({
      kind: 'LEAD' as const,
      id: row.id,
      name: row.name,
      referenceNumber: row.reference_number,
    })),
    clients: clients.map((row) => ({
      kind: 'CLIENT' as const,
      id: row.id,
      name: row.name,
      referenceNumber: row.reference_number,
    })),
  };
}

export async function adminNameMap(
  tx: Pick<Tx, 'platformAdmin'>,
  ids: Iterable<string | null>,
): Promise<Map<string, string>> {
  const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const admins = await tx.platformAdmin.findMany({
    where: { id: { in: unique } },
    select: { id: true, displayName: true },
  });
  return new Map(admins.map((admin) => [admin.id, admin.displayName]));
}
