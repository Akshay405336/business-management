import type {
  WhatsAppAnalyticsResponse,
  WhatsAppAssigneeSummary,
  WhatsAppBroadcastAudiencePreview,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastSummary,
  WhatsAppChannelStatus,
  WhatsAppChannelSummary,
  WhatsAppConsentStatus,
  WhatsAppConversationListResponse,
  WhatsAppConversationStatus,
  WhatsAppConversationSummary,
  WhatsAppFolderCounts,
  WhatsAppMessageType,
  WhatsAppMessageView,
  WhatsAppRealtimeEvent,
  WhatsAppTemplateSummary,
  WhatsAppTimelineResponse,
} from '@techwin/contracts';
import type {
  WhatsAppAnalyticsQuery,
  WhatsAppBroadcastAudience,
  WhatsAppConversationListQuery,
  WhatsAppTemplateListQuery,
  WhatsAppTimelineQuery,
} from '@techwin/validation';
import type { ProviderPhoneNumberInfo, ProviderTemplate } from '../domain/whatsapp.ports.js';
import type {
  InboundMessage,
  StatusReceipt,
  TemplateStatusChange,
} from '../domain/whatsapp-webhook-payload.js';

export const WHATSAPP_CHANNEL_STORE = Symbol('WHATSAPP_CHANNEL_STORE');
export const WHATSAPP_WEBHOOK_EVENT_STORE = Symbol('WHATSAPP_WEBHOOK_EVENT_STORE');
export const WHATSAPP_MESSAGE_STORE = Symbol('WHATSAPP_MESSAGE_STORE');
export const WHATSAPP_INBOX_STORE = Symbol('WHATSAPP_INBOX_STORE');
export const WHATSAPP_TEMPLATE_STORE = Symbol('WHATSAPP_TEMPLATE_STORE');
export const WHATSAPP_BROADCAST_STORE = Symbol('WHATSAPP_BROADCAST_STORE');
export const WHATSAPP_ANALYTICS_STORE = Symbol('WHATSAPP_ANALYTICS_STORE');

/** Decrypted credentials; only ever held in memory for a provider call. */
export interface ChannelCredentialsRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: WhatsAppChannelStatus;
  readonly businessAccountId: string;
  readonly phoneNumberId: string;
  readonly accessToken: string | null;
  readonly isActive: boolean;
  readonly createdByAdminId: string;
}

export interface WebhookChannelRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly businessAccountId: string;
  readonly phoneNumberId: string;
  readonly verifyTokenHash: string | null;
  readonly appSecret: string | null;
  readonly isActive: boolean;
}

export type ChannelVerificationResult =
  | { readonly ok: true; readonly info: ProviderPhoneNumberInfo }
  | {
      readonly ok: false;
      readonly code: string | null;
      readonly message: string;
      readonly credentialProblem: boolean;
    };

export interface CreateChannelInput {
  readonly organizationId: string;
  readonly adminId: string;
  readonly name: string;
  readonly connectionMethod: 'MANUAL' | 'EMBEDDED_SIGNUP';
  readonly metaAppId: string | null;
  readonly businessAccountId: string;
  readonly phoneNumberId: string;
  readonly accessToken: string;
  readonly appSecret: string | null;
  readonly verifyToken: string;
}

export interface WhatsAppChannelStore {
  list(organizationId: string): Promise<readonly WhatsAppChannelSummary[]>;
  getSummary(organizationId: string, id: string): Promise<WhatsAppChannelSummary | null>;
  getCredentials(organizationId: string, id: string): Promise<ChannelCredentialsRecord | null>;
  getCredentialsForWorker(channelId: string): Promise<ChannelCredentialsRecord | null>;
  findForWebhook(webhookKey: string): Promise<WebhookChannelRecord | null>;
  assertPhoneNumberAvailable(phoneNumberId: string, exceptChannelId?: string): Promise<void>;
  create(input: CreateChannelInput): Promise<{ readonly id: string }>;
  rename(organizationId: string, adminId: string, id: string, name: string): Promise<void>;
  rotateCredentials(
    organizationId: string,
    adminId: string,
    id: string,
    credentials: {
      readonly accessToken?: string;
      readonly appSecret?: string;
      readonly verifyToken?: string;
    },
  ): Promise<void>;
  recordVerification(
    organizationId: string,
    id: string,
    result: ChannelVerificationResult,
  ): Promise<void>;
  markCredentialProblem(channelId: string, code: string | null, message: string): Promise<void>;
  markWebhookVerified(channelId: string): Promise<void>;
  markWebhookReceived(channelId: string): Promise<void>;
  markTemplatesSynced(organizationId: string, id: string, at: Date): Promise<void>;
  disconnect(organizationId: string, adminId: string, id: string): Promise<void>;
  softDelete(organizationId: string, adminId: string, id: string): Promise<void>;
}

export interface ClaimedWebhookEvent {
  readonly id: string;
  readonly organizationId: string;
  readonly channelId: string;
  readonly payload: unknown;
  readonly attemptCount: number;
}

export interface WhatsAppWebhookEventStore {
  persist(
    channel: { readonly id: string; readonly organizationId: string },
    payloadSha256: string,
    payload: unknown,
  ): Promise<{ readonly eventId: string; readonly duplicate: boolean }>;
  claim(limit: number, eventId?: string): Promise<readonly ClaimedWebhookEvent[]>;
  markProcessed(id: string): Promise<void>;
  markRetry(id: string, error: string, nextAttemptAt: Date): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface InboundIngestResult {
  readonly organizationId: string;
  readonly conversationId: string;
  readonly messageId: string;
  readonly media: {
    readonly providerMediaId: string;
    readonly mimeType: string;
    readonly fileName: string | null;
  } | null;
}

export interface OutboundMediaRef {
  readonly storedObjectId: string;
  readonly providerMediaId: string;
  readonly mimeType: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}

export interface CreateOutboundInput {
  readonly organizationId: string;
  readonly conversationId: string;
  readonly adminId: string | null;
  readonly type: WhatsAppMessageType;
  readonly body: string;
  readonly payload: Record<string, unknown> | null;
  readonly idempotencyKey: string | null;
  readonly templateId: string | null;
  readonly broadcastId: string | null;
  readonly media: OutboundMediaRef | null;
}

export interface OutboundDeliveryJob {
  readonly messageId: string;
  readonly organizationId: string;
  readonly channelId: string;
  readonly conversationId: string;
  readonly toWaId: string;
  readonly type: WhatsAppMessageType;
  readonly body: string;
  readonly payload: Record<string, unknown> | null;
  readonly status: string;
  readonly attemptCount: number;
  readonly mediaProviderId: string | null;
  readonly mediaMimeType: string | null;
  readonly mediaFileName: string | null;
  readonly mediaStoredObjectId: string | null;
}

export interface ReceiptResult {
  readonly known: boolean;
  readonly applied: boolean;
  readonly organizationId: string | null;
  readonly conversationId: string | null;
  readonly messageId: string | null;
}

export interface WhatsAppMessageStore {
  ingestInbound(
    channel: { readonly id: string; readonly organizationId: string },
    message: InboundMessage,
  ): Promise<InboundIngestResult | null>;
  attachInboundMedia(
    messageId: string,
    result:
      | {
          readonly ok: true;
          readonly storedObjectId: string;
          readonly mimeType: string;
          readonly sizeBytes: number;
          readonly fileName: string;
        }
      | { readonly ok: false; readonly reason: string },
  ): Promise<{ readonly organizationId: string; readonly conversationId: string } | null>;
  applyReceipt(channelId: string, receipt: StatusReceipt): Promise<ReceiptResult>;
  applyTemplateStatus(channelId: string, change: TemplateStatusChange): Promise<void>;
  createOutbound(
    input: CreateOutboundInput,
  ): Promise<{ readonly messageId: string; readonly duplicate: boolean }>;
  getDeliveryJob(messageId: string): Promise<OutboundDeliveryJob | null>;
  /** Atomically claims a queued message for sending; false when another worker owns it. */
  claimForSending(messageId: string): Promise<boolean>;
  markSent(messageId: string, providerMessageId: string): Promise<void>;
  markRetry(messageId: string, error: string, nextAttemptAt: Date): Promise<void>;
  markFailed(messageId: string, code: string | null, message: string): Promise<void>;
  requeueFailed(organizationId: string, messageId: string): Promise<boolean>;
  claimDueRetries(limit: number): Promise<readonly string[]>;
  failStuckSending(olderThan: Date): Promise<number>;
  getMediaRef(
    organizationId: string,
    messageId: string,
  ): Promise<{
    readonly conversationId: string;
    readonly storedObjectId: string | null;
    readonly mimeType: string | null;
    readonly fileName: string | null;
  } | null>;
}

export interface InboxScope {
  readonly canViewAll: boolean;
  readonly employeeId: string | null;
}

export interface ConversationAccessRecord {
  readonly summary: WhatsAppConversationSummary;
  readonly channelId: string;
  readonly contactId: string;
  readonly contactWaId: string;
  readonly consentStatus: WhatsAppConsentStatus;
  readonly assignedEmployeeId: string | null;
  readonly lastInboundAt: Date | null;
  readonly status: WhatsAppConversationStatus;
  readonly lastInboundProviderMessageId: string | null;
}

export interface WhatsAppInboxStore {
  resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null>;
  listConversations(
    organizationId: string,
    scope: InboxScope,
    query: WhatsAppConversationListQuery,
  ): Promise<WhatsAppConversationListResponse>;
  folderCounts(organizationId: string, scope: InboxScope): Promise<WhatsAppFolderCounts>;
  getConversation(organizationId: string, id: string): Promise<ConversationAccessRecord | null>;
  timeline(
    organizationId: string,
    conversationId: string,
    query: WhatsAppTimelineQuery,
  ): Promise<WhatsAppTimelineResponse>;
  getMessageView(organizationId: string, messageId: string): Promise<WhatsAppMessageView | null>;
  addNote(
    organizationId: string,
    conversationId: string,
    adminId: string,
    body: string,
  ): Promise<void>;
  isAssignableEmployee(organizationId: string, employeeId: string): Promise<boolean>;
  assign(
    organizationId: string,
    conversationId: string,
    adminId: string,
    employeeId: string | null,
    reason: string | null,
  ): Promise<boolean>;
  setStatus(
    organizationId: string,
    conversationId: string,
    adminId: string,
    status: 'OPEN' | 'RESOLVED' | 'SPAM',
  ): Promise<boolean>;
  markRead(organizationId: string, conversationId: string): Promise<boolean>;
  setConsent(
    organizationId: string,
    contactId: string,
    adminId: string,
    status: 'OPTED_IN' | 'OPTED_OUT',
    source: string,
  ): Promise<void>;
  setCrmLink(
    organizationId: string,
    contactId: string,
    adminId: string,
    kind: 'LEAD' | 'CLIENT',
    recordId: string | null,
  ): Promise<void>;
  startConversation(input: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly channelId: string;
    readonly waId: string;
    readonly profileName: string;
    readonly leadId: string | null;
    readonly clientId: string | null;
  }): Promise<{ readonly conversationId: string }>;
  listAssignees(organizationId: string): Promise<readonly WhatsAppAssigneeSummary[]>;
  latestEventCursor(organizationId: string): Promise<bigint>;
  eventsAfter(
    organizationId: string,
    scope: InboxScope,
    after: bigint,
    limit: number,
  ): Promise<{ readonly events: readonly WhatsAppRealtimeEvent[]; readonly lastScanned: bigint }>;
}

export interface WhatsAppTemplateStore {
  replaceSynced(
    organizationId: string,
    channelId: string,
    templates: readonly ProviderTemplate[],
    at: Date,
  ): Promise<{ readonly synced: number; readonly removed: number }>;
  list(
    organizationId: string,
    query: WhatsAppTemplateListQuery,
  ): Promise<readonly WhatsAppTemplateSummary[]>;
  get(organizationId: string, id: string): Promise<WhatsAppTemplateSummary | null>;
  /** Summary plus the raw Meta components needed to bind send parameters. */
  getForSend(
    organizationId: string,
    id: string,
  ): Promise<{ readonly summary: WhatsAppTemplateSummary; readonly components: unknown } | null>;
  recordSubmitted(
    organizationId: string,
    adminId: string,
    channelId: string,
    template: ProviderTemplate,
  ): Promise<WhatsAppTemplateSummary>;
}

export interface BroadcastRecipientJob {
  readonly recipientId: string;
  readonly organizationId: string;
  readonly broadcastId: string;
  readonly channelId: string;
  readonly templateId: string;
  readonly templateVariables: readonly string[];
  readonly createdByAdminId: string;
  readonly contactId: string;
  readonly contactName: string;
  readonly phoneE164: string;
  readonly consentStatus: WhatsAppConsentStatus;
  readonly attemptCount: number;
}

export interface WhatsAppBroadcastStore {
  previewAudience(
    organizationId: string,
    channelId: string,
    audience: WhatsAppBroadcastAudience,
  ): Promise<WhatsAppBroadcastAudiencePreview>;
  create(input: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly name: string;
    readonly channelId: string;
    readonly templateId: string;
    readonly templateVariables: readonly string[];
    readonly audience: WhatsAppBroadcastAudience;
    readonly scheduledAt: Date | null;
    readonly idempotencyKey: string;
  }): Promise<{ readonly id: string; readonly duplicate: boolean }>;
  list(organizationId: string): Promise<readonly WhatsAppBroadcastSummary[]>;
  get(organizationId: string, id: string): Promise<WhatsAppBroadcastDetail | null>;
  cancel(organizationId: string, adminId: string, id: string): Promise<boolean>;
  startDue(now: Date): Promise<number>;
  claimRecipients(limit: number): Promise<readonly BroadcastRecipientJob[]>;
  /** Existing thread for the contact, or a new one filed as resolved until the customer replies. */
  ensureConversation(organizationId: string, channelId: string, contactId: string): Promise<string>;
  markRecipientQueued(recipientId: string, messageId: string): Promise<void>;
  markRecipientSkipped(recipientId: string, reason: string): Promise<void>;
  markRecipientRetry(recipientId: string, reason: string, nextAttemptAt: Date): Promise<void>;
  markRecipientFailed(recipientId: string, reason: string): Promise<void>;
  completeFinished(): Promise<number>;
}

export interface WhatsAppAnalyticsStore {
  summary(
    organizationId: string,
    query: WhatsAppAnalyticsQuery,
  ): Promise<WhatsAppAnalyticsResponse>;
}
