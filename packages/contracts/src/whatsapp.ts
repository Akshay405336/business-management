import { API_PREFIX } from './http.js';

const WA = `${API_PREFIX}/whatsapp`;

export const WHATSAPP_ROUTES = {
  setup: `${WA}/setup`,
  channels: `${WA}/channels`,
  channel: (id: string) => `${WA}/channels/${id}`,
  channelTest: (id: string) => `${WA}/channels/${id}/test`,
  channelCredentials: (id: string) => `${WA}/channels/${id}/credentials`,
  channelDisconnect: (id: string) => `${WA}/channels/${id}/disconnect`,
  channelSyncTemplates: (id: string) => `${WA}/channels/${id}/sync-templates`,
  embeddedSignup: `${WA}/channels/embedded-signup`,
  conversations: `${WA}/conversations`,
  conversationCounts: `${WA}/conversations/counts`,
  conversation: (id: string) => `${WA}/conversations/${id}`,
  conversationTimeline: (id: string) => `${WA}/conversations/${id}/timeline`,
  conversationMessages: (id: string) => `${WA}/conversations/${id}/messages`,
  conversationMediaMessages: (id: string) => `${WA}/conversations/${id}/media-messages`,
  conversationTemplateMessages: (id: string) => `${WA}/conversations/${id}/template-messages`,
  conversationNotes: (id: string) => `${WA}/conversations/${id}/notes`,
  conversationAssignment: (id: string) => `${WA}/conversations/${id}/assignment`,
  conversationStatus: (id: string) => `${WA}/conversations/${id}/status`,
  conversationRead: (id: string) => `${WA}/conversations/${id}/read`,
  messageMedia: (id: string) => `${WA}/messages/${id}/media`,
  messageRetry: (id: string) => `${WA}/messages/${id}/retry`,
  contactConsent: (id: string) => `${WA}/contacts/${id}/consent`,
  contactCrmLink: (id: string) => `${WA}/contacts/${id}/crm-link`,
  assignees: `${WA}/assignees`,
  templates: `${WA}/templates`,
  template: (id: string) => `${WA}/templates/${id}`,
  broadcasts: `${WA}/broadcasts`,
  broadcastAudiencePreview: `${WA}/broadcasts/audience-preview`,
  broadcast: (id: string) => `${WA}/broadcasts/${id}`,
  broadcastCancel: (id: string) => `${WA}/broadcasts/${id}/cancel`,
  realtimeEvents: `${WA}/realtime/events`,
  analytics: `${WA}/analytics`,
  webhook: (channelKey: string) => `${API_PREFIX}/webhooks/whatsapp/${channelKey}`,
} as const;

export type WhatsAppChannelStatus =
  | 'PENDING_SETUP'
  | 'CONNECTED'
  | 'WEBHOOK_NOT_VERIFIED'
  | 'CONNECTION_ERROR'
  | 'DISCONNECTED';

export type WhatsAppConnectionMethod = 'MANUAL' | 'EMBEDDED_SIGNUP';

export interface WhatsAppSetupInfo {
  /** Absolute callback URL prefix to configure in Meta, or null when no public base URL is configured. */
  readonly webhookBaseUrl: string | null;
  readonly graphApiVersion: string;
  readonly credentialEncryptionConfigured: boolean;
  readonly embeddedSignup: {
    readonly available: boolean;
    readonly appId: string | null;
    readonly configId: string | null;
    readonly missing: readonly string[];
  };
}

/** Channel as exposed to the browser. Never contains tokens or secrets. */
export interface WhatsAppChannelSummary {
  readonly id: string;
  readonly name: string;
  readonly status: WhatsAppChannelStatus;
  readonly connectionMethod: WhatsAppConnectionMethod;
  readonly businessAccountId: string;
  readonly phoneNumberId: string;
  readonly displayPhoneNumber: string;
  readonly verifiedName: string;
  readonly qualityRating: string | null;
  readonly messagingLimitTier: string | null;
  readonly webhookUrl: string;
  readonly accessTokenMasked: string | null;
  readonly hasAppSecret: boolean;
  readonly hasVerifyToken: boolean;
  readonly credentialsUpdatedAt: string | null;
  readonly lastVerifiedAt: string | null;
  readonly webhookVerifiedAt: string | null;
  readonly lastWebhookAt: string | null;
  readonly templatesSyncedAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorMessage: string | null;
  readonly conversationCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WhatsAppChannelListResponse {
  readonly channels: readonly WhatsAppChannelSummary[];
}

export interface WhatsAppChannelTestResult {
  readonly ok: boolean;
  readonly channel: WhatsAppChannelSummary;
  readonly message: string;
}

export type WhatsAppConversationStatus = 'NEW' | 'OPEN' | 'RESOLVED' | 'SPAM';
export type WhatsAppConsentStatus = 'UNKNOWN' | 'OPTED_IN' | 'OPTED_OUT';
export type WhatsAppMessageDirection = 'INBOUND' | 'OUTBOUND';
export type WhatsAppMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACTS'
  | 'INTERACTIVE'
  | 'BUTTON'
  | 'REACTION'
  | 'TEMPLATE'
  | 'UNSUPPORTED';
export type WhatsAppMessageStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';
export type WhatsAppMediaStatus = 'NONE' | 'PENDING' | 'READY' | 'FAILED';

export type WhatsAppInboxFolder =
  | 'all'
  | 'new'
  | 'open'
  | 'resolved'
  | 'spam'
  | 'mine'
  | 'unassigned';

export interface WhatsAppCrmLink {
  readonly kind: 'LEAD' | 'CLIENT';
  readonly id: string;
  readonly name: string;
  readonly referenceNumber: string;
}

export interface WhatsAppContactSummary {
  readonly id: string;
  readonly waId: string;
  readonly phoneE164: string;
  readonly profileName: string;
  readonly displayName: string;
  readonly consentStatus: WhatsAppConsentStatus;
  readonly consentSource: string;
  readonly consentUpdatedAt: string | null;
  readonly crmLinks: readonly WhatsAppCrmLink[];
  /** Other CRM records with the same normalized phone that are not yet linked. */
  readonly crmMatches: readonly WhatsAppCrmLink[];
}

export interface WhatsAppAssigneeSummary {
  readonly employeeId: string;
  readonly displayName: string;
  readonly jobTitle: string;
  readonly profileImageUrl: string | null;
}

export interface WhatsAppConversationSummary {
  readonly id: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly status: WhatsAppConversationStatus;
  readonly contact: WhatsAppContactSummary;
  readonly assignee: WhatsAppAssigneeSummary | null;
  readonly unreadCount: number;
  readonly lastMessageAt: string;
  readonly lastMessagePreview: string;
  readonly lastMessageDirection: WhatsAppMessageDirection | null;
  readonly lastInboundAt: string | null;
  /** End of the customer-service window, or null when no inbound message exists. */
  readonly serviceWindowEndsAt: string | null;
  readonly createdAt: string;
}

export interface WhatsAppConversationListResponse {
  readonly items: readonly WhatsAppConversationSummary[];
  readonly nextCursor: string | null;
}

export type WhatsAppFolderCounts = Readonly<Record<WhatsAppInboxFolder, number>>;

export interface WhatsAppMessageView {
  readonly id: string;
  readonly conversationId: string;
  readonly direction: WhatsAppMessageDirection;
  readonly type: WhatsAppMessageType;
  readonly status: WhatsAppMessageStatus;
  readonly body: string;
  readonly payload: unknown;
  readonly media: {
    readonly status: WhatsAppMediaStatus;
    readonly mimeType: string | null;
    readonly fileName: string | null;
    readonly sizeBytes: number | null;
    /** Authenticated API path; null until the media is stored. */
    readonly url: string | null;
  } | null;
  readonly templateName: string | null;
  readonly sentBy: { readonly adminId: string; readonly name: string } | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly sentAt: string | null;
  readonly deliveredAt: string | null;
  readonly readAt: string | null;
  readonly failedAt: string | null;
  readonly createdAt: string;
}

export type WhatsAppTimelineEventType = 'NOTE_ADDED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'CONTACT_UPDATED';

export interface WhatsAppTimelineEvent {
  readonly id: string;
  readonly type: WhatsAppTimelineEventType;
  readonly body: string | null;
  readonly metadata: unknown;
  readonly actor: { readonly adminId: string; readonly name: string } | null;
  readonly createdAt: string;
}

export type WhatsAppTimelineItem =
  | { readonly kind: 'message'; readonly at: string; readonly message: WhatsAppMessageView }
  | { readonly kind: 'event'; readonly at: string; readonly event: WhatsAppTimelineEvent };

export interface WhatsAppConversationDetail {
  readonly conversation: WhatsAppConversationSummary;
  readonly canReply: boolean;
  readonly canAssign: boolean;
}

export interface WhatsAppTimelineResponse {
  readonly items: readonly WhatsAppTimelineItem[];
  /** Pass as `before` to load older items. */
  readonly olderCursor: string | null;
}

export interface WhatsAppSendMessageResponse {
  readonly message: WhatsAppMessageView;
}

export interface WhatsAppAssigneesResponse {
  readonly assignees: readonly WhatsAppAssigneeSummary[];
  readonly currentEmployeeId: string | null;
}

export interface WhatsAppTemplateParameterInfo {
  readonly component: 'HEADER' | 'BODY' | 'BUTTON';
  readonly index: number;
  readonly name: string;
}

export interface WhatsAppTemplateSummary {
  readonly id: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly providerTemplateId: string | null;
  readonly name: string;
  readonly language: string;
  readonly category: string;
  readonly status: string;
  readonly rejectedReason: string | null;
  readonly qualityScore: string | null;
  readonly bodyText: string;
  readonly headerText: string | null;
  readonly footerText: string | null;
  readonly buttons: readonly { readonly type: string; readonly text: string }[];
  readonly parameters: readonly WhatsAppTemplateParameterInfo[];
  readonly sendable: boolean;
  readonly lastSyncedAt: string | null;
}

export interface WhatsAppTemplateListResponse {
  readonly templates: readonly WhatsAppTemplateSummary[];
}

export interface WhatsAppTemplateSyncResponse {
  readonly synced: number;
  readonly removed: number;
  readonly templatesSyncedAt: string;
}

export type WhatsAppBroadcastStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type WhatsAppBroadcastAudienceSource = 'ALL_OPTED_IN' | 'CLIENTS' | 'LEADS' | 'SELECTED';

export interface WhatsAppBroadcastAudiencePreview {
  readonly eligible: number;
  readonly excludedNoConsent: number;
  readonly excludedOptedOut: number;
  readonly sample: readonly { readonly contactId: string; readonly name: string; readonly phoneE164: string }[];
}

export interface WhatsAppBroadcastStats {
  readonly total: number;
  readonly pending: number;
  readonly sent: number;
  readonly delivered: number;
  readonly read: number;
  readonly failed: number;
  readonly skipped: number;
}

export interface WhatsAppBroadcastSummary {
  readonly id: string;
  readonly name: string;
  readonly channelId: string;
  readonly channelName: string;
  readonly templateId: string;
  readonly templateName: string;
  readonly templateLanguage: string;
  readonly status: WhatsAppBroadcastStatus;
  readonly audienceSource: WhatsAppBroadcastAudienceSource;
  readonly scheduledAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly stats: WhatsAppBroadcastStats;
  readonly createdAt: string;
}

export interface WhatsAppBroadcastListResponse {
  readonly broadcasts: readonly WhatsAppBroadcastSummary[];
}

export interface WhatsAppBroadcastDetail extends WhatsAppBroadcastSummary {
  readonly templateVariables: readonly string[];
  readonly failures: readonly {
    readonly contactId: string;
    readonly name: string;
    readonly phoneE164: string;
    readonly errorMessage: string;
  }[];
}

export type WhatsAppRealtimeEventType =
  | 'CONVERSATION_CREATED'
  | 'MESSAGE_RECEIVED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_UPDATED'
  | 'NOTE_ADDED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'CONTACT_UPDATED';

/** Realtime notifications carry identifiers only; clients refetch through authorized endpoints. */
export interface WhatsAppRealtimeEvent {
  readonly cursor: string;
  readonly type: WhatsAppRealtimeEventType;
  readonly conversationId: string;
  readonly messageId: string | null;
  readonly createdAt: string;
}

export interface WhatsAppRealtimeResponse {
  readonly events: readonly WhatsAppRealtimeEvent[];
  readonly cursor: string;
  /** True when the client fell too far behind and must reload its views. */
  readonly resync: boolean;
}

export interface WhatsAppAnalyticsResponse {
  readonly from: string;
  readonly to: string;
  readonly messages: {
    readonly inbound: number;
    readonly outbound: number;
    readonly delivered: number;
    readonly read: number;
    readonly failed: number;
  };
  readonly conversations: {
    readonly started: number;
    readonly resolved: number;
    readonly open: number;
    readonly unassigned: number;
    readonly averageFirstResponseSeconds: number | null;
  };
  readonly byChannel: readonly {
    readonly channelId: string;
    readonly channelName: string;
    readonly inbound: number;
    readonly outbound: number;
  }[];
  readonly byAgent: readonly {
    readonly employeeId: string;
    readonly displayName: string;
    readonly assigned: number;
    readonly resolved: number;
  }[];
  readonly broadcasts: { readonly total: number; readonly recipients: number; readonly failed: number };
}
