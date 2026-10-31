import { z } from 'zod';

const uuid = z.string().uuid();
const metaNumericId = z
  .string()
  .trim()
  .regex(/^\d{5,32}$/, 'Use the numeric ID shown in Meta Business Manager.');
const accessToken = z
  .string()
  .trim()
  .min(20, 'The access token looks too short.')
  .max(4096)
  .regex(/^[A-Za-z0-9_\-.|]+$/, 'The access token contains unexpected characters.');
const appSecret = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{32}$/i, 'The app secret is a 32-character hexadecimal value.');
const verifyToken = z
  .string()
  .trim()
  .min(16, 'Use at least 16 characters for the verify token.')
  .max(128)
  .regex(/^[A-Za-z0-9_\-.~]+$/, 'Use letters, numbers, dot, dash, underscore or tilde.');
const idempotencyKey = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const whatsappCreateChannelRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    businessAccountId: metaNumericId,
    phoneNumberId: metaNumericId,
    metaAppId: metaNumericId.optional(),
    accessToken,
    appSecret: appSecret.optional(),
    verifyToken,
  })
  .strict();
export type WhatsAppCreateChannelRequest = z.infer<typeof whatsappCreateChannelRequestSchema>;

export const whatsappUpdateChannelRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict();
export type WhatsAppUpdateChannelRequest = z.infer<typeof whatsappUpdateChannelRequestSchema>;

export const whatsappRotateCredentialsRequestSchema = z
  .object({
    accessToken: accessToken.optional(),
    appSecret: appSecret.optional(),
    verifyToken: verifyToken.optional(),
  })
  .strict()
  .refine((value) => value.accessToken ?? value.appSecret ?? value.verifyToken, {
    message: 'Provide at least one credential to rotate.',
  });
export type WhatsAppRotateCredentialsRequest = z.infer<
  typeof whatsappRotateCredentialsRequestSchema
>;

export const whatsappEmbeddedSignupRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    code: z.string().trim().min(10).max(2048),
    businessAccountId: metaNumericId,
    phoneNumberId: metaNumericId,
    verifyToken,
  })
  .strict();
export type WhatsAppEmbeddedSignupRequest = z.infer<typeof whatsappEmbeddedSignupRequestSchema>;

export const whatsappInboxFolderSchema = z.enum([
  'all',
  'new',
  'open',
  'resolved',
  'spam',
  'mine',
  'unassigned',
]);

export const whatsappConversationListQuerySchema = z.object({
  folder: whatsappInboxFolderSchema.default('all'),
  channelId: uuid.optional(),
  assigneeId: uuid.optional(),
  search: z.string().trim().max(120).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type WhatsAppConversationListQuery = z.infer<typeof whatsappConversationListQuerySchema>;

export const whatsappTimelineQuerySchema = z.object({
  before: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type WhatsAppTimelineQuery = z.infer<typeof whatsappTimelineQuerySchema>;

export const whatsappSendTextRequestSchema = z
  .object({
    body: z.string().trim().min(1, 'Type a message.').max(4096),
    idempotencyKey,
  })
  .strict();
export type WhatsAppSendTextRequest = z.infer<typeof whatsappSendTextRequestSchema>;

export const whatsappSendMediaFieldsSchema = z
  .object({
    caption: z.string().trim().max(1024).optional(),
    idempotencyKey,
  })
  .strict();
export type WhatsAppSendMediaFields = z.infer<typeof whatsappSendMediaFieldsSchema>;

export const whatsappSendTemplateRequestSchema = z
  .object({
    templateId: uuid,
    variables: z.array(z.string().trim().min(1).max(1024)).max(30).default([]),
    idempotencyKey,
  })
  .strict();
export type WhatsAppSendTemplateRequest = z.infer<typeof whatsappSendTemplateRequestSchema>;

export const whatsappAddNoteRequestSchema = z
  .object({
    body: z.string().trim().min(1, 'Write a note.').max(4000),
  })
  .strict();
export type WhatsAppAddNoteRequest = z.infer<typeof whatsappAddNoteRequestSchema>;

export const whatsappAssignRequestSchema = z
  .object({
    employeeId: uuid.nullable(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();
export type WhatsAppAssignRequest = z.infer<typeof whatsappAssignRequestSchema>;

export const whatsappConversationStatusRequestSchema = z
  .object({
    status: z.enum(['OPEN', 'RESOLVED', 'SPAM']),
  })
  .strict();
export type WhatsAppConversationStatusRequest = z.infer<
  typeof whatsappConversationStatusRequestSchema
>;

export const whatsappConsentRequestSchema = z
  .object({
    status: z.enum(['OPTED_IN', 'OPTED_OUT']),
    source: z.string().trim().min(3, 'Describe how consent was collected.').max(160),
  })
  .strict();
export type WhatsAppConsentRequest = z.infer<typeof whatsappConsentRequestSchema>;

export const whatsappCrmLinkRequestSchema = z
  .object({
    kind: z.enum(['LEAD', 'CLIENT']),
    id: uuid.nullable(),
  })
  .strict();
export type WhatsAppCrmLinkRequest = z.infer<typeof whatsappCrmLinkRequestSchema>;

export const whatsappStartConversationRequestSchema = z
  .object({
    channelId: uuid,
    phone: z.string().trim().min(6).max(32),
    profileName: z.string().trim().max(160).optional(),
    leadId: uuid.optional(),
    clientId: uuid.optional(),
  })
  .strict();
export type WhatsAppStartConversationRequest = z.infer<
  typeof whatsappStartConversationRequestSchema
>;

export const whatsappTemplateListQuerySchema = z.object({
  channelId: uuid.optional(),
  status: z.string().trim().max(32).optional(),
  search: z.string().trim().max(120).optional(),
});
export type WhatsAppTemplateListQuery = z.infer<typeof whatsappTemplateListQuerySchema>;

export const whatsappCreateTemplateRequestSchema = z
  .object({
    channelId: uuid,
    name: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores.'),
    language: z
      .string()
      .trim()
      .regex(/^[a-z]{2,3}(_[A-Z]{2})?$/, 'Use a Meta language code such as en or en_US.'),
    category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
    headerText: z.string().trim().max(60).optional(),
    bodyText: z.string().trim().min(1).max(1024),
    footerText: z.string().trim().max(60).optional(),
    bodyExamples: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  })
  .strict();
export type WhatsAppCreateTemplateRequest = z.infer<typeof whatsappCreateTemplateRequestSchema>;

export const whatsappBroadcastAudienceSchema = z
  .object({
    source: z.enum(['ALL_OPTED_IN', 'CLIENTS', 'LEADS', 'SELECTED']),
    contactIds: z.array(uuid).max(5000).optional(),
  })
  .strict()
  .refine((value) => value.source !== 'SELECTED' || (value.contactIds?.length ?? 0) > 0, {
    message: 'Select at least one contact.',
    path: ['contactIds'],
  });
export type WhatsAppBroadcastAudience = z.infer<typeof whatsappBroadcastAudienceSchema>;

export const whatsappBroadcastAudiencePreviewRequestSchema = z
  .object({
    channelId: uuid,
    audience: whatsappBroadcastAudienceSchema,
  })
  .strict();
export type WhatsAppBroadcastAudiencePreviewRequest = z.infer<
  typeof whatsappBroadcastAudiencePreviewRequestSchema
>;

export const whatsappCreateBroadcastRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    channelId: uuid,
    templateId: uuid,
    templateVariables: z.array(z.string().trim().min(1).max(1024)).max(30).default([]),
    audience: whatsappBroadcastAudienceSchema,
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    confirmed: z.literal(true, { error: 'Confirm the broadcast before sending.' }),
    idempotencyKey,
  })
  .strict();
export type WhatsAppCreateBroadcastRequest = z.infer<typeof whatsappCreateBroadcastRequestSchema>;

export const whatsappRealtimeQuerySchema = z.object({
  after: z
    .string()
    .regex(/^\d{1,20}$/)
    .optional(),
  waitMs: z.coerce.number().int().min(0).max(25_000).default(10_000),
});
export type WhatsAppRealtimeQuery = z.infer<typeof whatsappRealtimeQuerySchema>;

export const whatsappAnalyticsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  channelId: uuid.optional(),
});
export type WhatsAppAnalyticsQuery = z.infer<typeof whatsappAnalyticsQuerySchema>;
