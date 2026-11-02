import { Module, type Provider, type Type } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { CacheModule } from '../../infrastructure/cache/cache.module.js';
import { RedisRateLimiter } from '../../infrastructure/cache/redis-rate-limiter.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import {
  RATE_LIMITER,
  type RateLimiter,
} from '../../infrastructure/security/security.contracts.js';
import { AuthModule } from '../auth/index.js';
import { CrmModule } from '../crm/index.js';
import { MediaModule } from '../media/index.js';
import { OrgAccessModule } from '../org-access/index.js';
import { AddWhatsAppConversationNoteHandler } from './application/add-whatsapp-conversation-note/add-whatsapp-conversation-note.handler.js';
import { AssignWhatsAppConversationHandler } from './application/assign-whatsapp-conversation/assign-whatsapp-conversation.handler.js';
import { CancelWhatsAppBroadcastHandler } from './application/cancel-whatsapp-broadcast/cancel-whatsapp-broadcast.handler.js';
import { CreateWhatsAppBroadcastHandler } from './application/create-whatsapp-broadcast/create-whatsapp-broadcast.handler.js';
import { CreateWhatsAppChannelHandler } from './application/create-whatsapp-channel/create-whatsapp-channel.handler.js';
import { CreateWhatsAppTemplateHandler } from './application/create-whatsapp-template/create-whatsapp-template.handler.js';
import { DeleteWhatsAppChannelHandler } from './application/delete-whatsapp-channel/delete-whatsapp-channel.handler.js';
import { DisconnectWhatsAppChannelHandler } from './application/disconnect-whatsapp-channel/disconnect-whatsapp-channel.handler.js';
import { GetWhatsAppAnalyticsHandler } from './application/get-whatsapp-analytics/get-whatsapp-analytics.handler.js';
import { GetWhatsAppBroadcastHandler } from './application/get-whatsapp-broadcast/get-whatsapp-broadcast.handler.js';
import { GetWhatsAppChannelHandler } from './application/get-whatsapp-channel/get-whatsapp-channel.handler.js';
import { GetWhatsAppConversationHandler } from './application/get-whatsapp-conversation/get-whatsapp-conversation.handler.js';
import { GetWhatsAppConversationCountsHandler } from './application/get-whatsapp-conversation-counts/get-whatsapp-conversation-counts.handler.js';
import { GetWhatsAppConversationTimelineHandler } from './application/get-whatsapp-conversation-timeline/get-whatsapp-conversation-timeline.handler.js';
import { GetWhatsAppSetupHandler } from './application/get-whatsapp-setup/get-whatsapp-setup.handler.js';
import { GetWhatsAppTemplateHandler } from './application/get-whatsapp-template/get-whatsapp-template.handler.js';
import { ListWhatsAppAssigneesHandler } from './application/list-whatsapp-assignees/list-whatsapp-assignees.handler.js';
import { ListWhatsAppBroadcastsHandler } from './application/list-whatsapp-broadcasts/list-whatsapp-broadcasts.handler.js';
import { ListWhatsAppChannelsHandler } from './application/list-whatsapp-channels/list-whatsapp-channels.handler.js';
import { ListWhatsAppConversationsHandler } from './application/list-whatsapp-conversations/list-whatsapp-conversations.handler.js';
import { ListWhatsAppTemplatesHandler } from './application/list-whatsapp-templates/list-whatsapp-templates.handler.js';
import { MarkWhatsAppConversationReadHandler } from './application/mark-whatsapp-conversation-read/mark-whatsapp-conversation-read.handler.js';
import { OpenWhatsAppMessageMediaHandler } from './application/open-whatsapp-message-media/open-whatsapp-message-media.handler.js';
import { PollWhatsAppRealtimeEventsHandler } from './application/poll-whatsapp-realtime-events/poll-whatsapp-realtime-events.handler.js';
import { PreviewWhatsAppBroadcastAudienceHandler } from './application/preview-whatsapp-broadcast-audience/preview-whatsapp-broadcast-audience.handler.js';
import { ReceiveWhatsAppWebhookHandler } from './application/receive-whatsapp-webhook/receive-whatsapp-webhook.handler.js';
import { RetryWhatsAppMessageHandler } from './application/retry-whatsapp-message/retry-whatsapp-message.handler.js';
import { RotateWhatsAppChannelCredentialsHandler } from './application/rotate-whatsapp-channel-credentials/rotate-whatsapp-channel-credentials.handler.js';
import { SendWhatsAppMediaMessageHandler } from './application/send-whatsapp-media-message/send-whatsapp-media-message.handler.js';
import { SendWhatsAppTemplateMessageHandler } from './application/send-whatsapp-template-message/send-whatsapp-template-message.handler.js';
import { SendWhatsAppTextMessageHandler } from './application/send-whatsapp-text-message/send-whatsapp-text-message.handler.js';
import { SetWhatsAppContactConsentHandler } from './application/set-whatsapp-contact-consent/set-whatsapp-contact-consent.handler.js';
import { SetWhatsAppContactCrmLinkHandler } from './application/set-whatsapp-contact-crm-link/set-whatsapp-contact-crm-link.handler.js';
import { SetWhatsAppConversationStatusHandler } from './application/set-whatsapp-conversation-status/set-whatsapp-conversation-status.handler.js';
import { StartWhatsAppConversationHandler } from './application/start-whatsapp-conversation/start-whatsapp-conversation.handler.js';
import { SyncWhatsAppChannelTemplatesHandler } from './application/sync-whatsapp-channel-templates/sync-whatsapp-channel-templates.handler.js';
import { TestWhatsAppChannelHandler } from './application/test-whatsapp-channel/test-whatsapp-channel.handler.js';
import { UpdateWhatsAppChannelHandler } from './application/update-whatsapp-channel/update-whatsapp-channel.handler.js';
import { VerifyWhatsAppWebhookHandler } from './application/verify-whatsapp-webhook/verify-whatsapp-webhook.handler.js';
import { WhatsAppEmbeddedSignupChannelHandler } from './application/whatsapp-embedded-signup-channel/whatsapp-embedded-signup-channel.handler.js';
import { WhatsAppAnalyticsService } from './application/services/whatsapp-analytics.service.js';
import { WhatsAppBroadcastService } from './application/services/whatsapp-broadcast.service.js';
import { WhatsAppChannelService } from './application/services/whatsapp-channel.service.js';
import { WhatsAppEmployeeIdResolver } from './application/services/whatsapp-employee-id.resolver.js';
import { WhatsAppInboxService } from './application/services/whatsapp-inbox.service.js';
import { WhatsAppJobRunner } from './application/services/whatsapp-job-runner.service.js';
import { WhatsAppOutboundService } from './application/services/whatsapp-outbound.service.js';
import { WhatsAppRealtimeService } from './application/services/whatsapp-realtime.service.js';
import { WhatsAppTemplateService } from './application/services/whatsapp-template.service.js';
import { WhatsAppWebhookProcessor } from './application/services/whatsapp-webhook-processor.service.js';
import { WhatsAppWebhookService } from './application/services/whatsapp-webhook.service.js';
import {
  WHATSAPP_ANALYTICS_STORE,
  WHATSAPP_BROADCAST_STORE,
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_INBOX_STORE,
  WHATSAPP_MESSAGE_STORE,
  WHATSAPP_TEMPLATE_STORE,
  WHATSAPP_WEBHOOK_EVENT_STORE,
  type WhatsAppAnalyticsStore,
  type WhatsAppBroadcastStore,
  type WhatsAppChannelStore,
  type WhatsAppInboxStore,
  type WhatsAppMessageStore,
  type WhatsAppTemplateStore,
  type WhatsAppWebhookEventStore,
} from './application/repositories/whatsapp-stores.js';
import {
  WHATSAPP_CREDENTIAL_CIPHER,
  WHATSAPP_DISTRIBUTED_LOCK,
  WHATSAPP_MEDIA_STORE,
  WHATSAPP_PROVIDER,
  WHATSAPP_SETTINGS,
  type WhatsAppCredentialCipherPort,
  type WhatsAppDistributedLockPort,
  type WhatsAppMediaStorePort,
  type WhatsAppProviderPort,
  type WhatsAppSettings,
} from './domain/whatsapp.ports.js';
import { MetaCloudApiProvider } from './infrastructure/adapters/meta-cloud-api/meta-cloud-api.provider.js';
import { RedisWhatsAppLock } from './infrastructure/cache/redis-whatsapp-lock.js';
import { PrismaWhatsAppAnalyticsStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-analytics.store.js';
import { PrismaWhatsAppBroadcastStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-broadcast.store.js';
import { PrismaWhatsAppChannelStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-channel.store.js';
import { PrismaWhatsAppInboxStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-inbox.store.js';
import { PrismaWhatsAppMessageStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-message.store.js';
import { PrismaWhatsAppTemplateStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-template.store.js';
import { PrismaWhatsAppWebhookEventStore } from './infrastructure/persistence/prisma/repositories/prisma-whatsapp-webhook-event.store.js';
import { AesGcmWhatsAppCredentialCipher } from './infrastructure/security/aes-gcm-whatsapp-credential-cipher.js';
import { WhatsAppMediaStore } from './infrastructure/storage/whatsapp-media.store.js';
import { WhatsAppCampaignsController } from './presentation/http/controllers/whatsapp-campaigns.controller.js';
import { WhatsAppChannelsController } from './presentation/http/controllers/whatsapp-channels.controller.js';
import { WhatsAppInboxController } from './presentation/http/controllers/whatsapp-inbox.controller.js';
import { WhatsAppRealtimeController } from './presentation/http/controllers/whatsapp-realtime.controller.js';
import { WhatsAppWebhookController } from './presentation/http/controllers/whatsapp-webhook.controller.js';
import { WhatsAppExceptionFilter } from './presentation/http/filters/whatsapp-exception.filter.js';
import { WhatsAppActorResolver } from './presentation/http/whatsapp-actor.resolver.js';

/** Binds a port token to its adapter; fails to compile if the adapter drifts from the port. */
const port =
  <Port>() =>
  <Impl extends Port>(token: symbol, implementation: Type<Impl>): Provider[] => [
    implementation,
    { provide: token, useExisting: implementation },
  ];

const settingsProvider: Provider = {
  provide: WHATSAPP_SETTINGS,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig): WhatsAppSettings => ({
    webhookBaseUrl: config.whatsapp.webhookBaseUrl,
    graphApiVersion: config.whatsapp.graphApiVersion,
    mediaMaxBytes: config.whatsapp.mediaMaxBytes,
    workerEnabled: config.whatsapp.workerEnabled,
    defaultAppSecret: config.whatsapp.metaAppSecret,
    embeddedSignup: {
      appId: config.whatsapp.metaAppId,
      configId: config.whatsapp.embeddedSignupConfigId,
      hasAppSecret: config.whatsapp.metaAppSecret !== null,
    },
  }),
};

export const whatsAppPersistenceProviders: Provider[] = [
  settingsProvider,
  {
    provide: RATE_LIMITER,
    inject: [RedisRateLimiter],
    useFactory: (limiter: RedisRateLimiter): RateLimiter => limiter,
  },
  ...port<WhatsAppProviderPort>()(WHATSAPP_PROVIDER, MetaCloudApiProvider),
  ...port<WhatsAppCredentialCipherPort>()(
    WHATSAPP_CREDENTIAL_CIPHER,
    AesGcmWhatsAppCredentialCipher,
  ),
  ...port<WhatsAppMediaStorePort>()(WHATSAPP_MEDIA_STORE, WhatsAppMediaStore),
  ...port<WhatsAppDistributedLockPort>()(WHATSAPP_DISTRIBUTED_LOCK, RedisWhatsAppLock),
  ...port<WhatsAppChannelStore>()(WHATSAPP_CHANNEL_STORE, PrismaWhatsAppChannelStore),
  ...port<WhatsAppWebhookEventStore>()(
    WHATSAPP_WEBHOOK_EVENT_STORE,
    PrismaWhatsAppWebhookEventStore,
  ),
  ...port<WhatsAppMessageStore>()(WHATSAPP_MESSAGE_STORE, PrismaWhatsAppMessageStore),
  ...port<WhatsAppInboxStore>()(WHATSAPP_INBOX_STORE, PrismaWhatsAppInboxStore),
  ...port<WhatsAppTemplateStore>()(WHATSAPP_TEMPLATE_STORE, PrismaWhatsAppTemplateStore),
  ...port<WhatsAppBroadcastStore>()(WHATSAPP_BROADCAST_STORE, PrismaWhatsAppBroadcastStore),
  ...port<WhatsAppAnalyticsStore>()(WHATSAPP_ANALYTICS_STORE, PrismaWhatsAppAnalyticsStore),
];

const whatsAppApplicationServices = [
  WhatsAppEmployeeIdResolver,
  WhatsAppRealtimeService,
  WhatsAppChannelService,
  WhatsAppTemplateService,
  WhatsAppOutboundService,
  WhatsAppInboxService,
  WhatsAppBroadcastService,
  WhatsAppAnalyticsService,
  WhatsAppWebhookProcessor,
  WhatsAppWebhookService,
  WhatsAppJobRunner,
] as const;

export const whatsAppUseCaseHandlers = [
  AddWhatsAppConversationNoteHandler,
  AssignWhatsAppConversationHandler,
  CancelWhatsAppBroadcastHandler,
  CreateWhatsAppBroadcastHandler,
  CreateWhatsAppChannelHandler,
  CreateWhatsAppTemplateHandler,
  DeleteWhatsAppChannelHandler,
  DisconnectWhatsAppChannelHandler,
  GetWhatsAppAnalyticsHandler,
  GetWhatsAppBroadcastHandler,
  GetWhatsAppChannelHandler,
  GetWhatsAppConversationHandler,
  GetWhatsAppConversationCountsHandler,
  GetWhatsAppConversationTimelineHandler,
  GetWhatsAppSetupHandler,
  GetWhatsAppTemplateHandler,
  ListWhatsAppAssigneesHandler,
  ListWhatsAppBroadcastsHandler,
  ListWhatsAppChannelsHandler,
  ListWhatsAppConversationsHandler,
  ListWhatsAppTemplatesHandler,
  MarkWhatsAppConversationReadHandler,
  OpenWhatsAppMessageMediaHandler,
  PollWhatsAppRealtimeEventsHandler,
  PreviewWhatsAppBroadcastAudienceHandler,
  ReceiveWhatsAppWebhookHandler,
  RetryWhatsAppMessageHandler,
  RotateWhatsAppChannelCredentialsHandler,
  SendWhatsAppMediaMessageHandler,
  SendWhatsAppTemplateMessageHandler,
  SendWhatsAppTextMessageHandler,
  SetWhatsAppContactConsentHandler,
  SetWhatsAppContactCrmLinkHandler,
  SetWhatsAppConversationStatusHandler,
  StartWhatsAppConversationHandler,
  SyncWhatsAppChannelTemplatesHandler,
  TestWhatsAppChannelHandler,
  UpdateWhatsAppChannelHandler,
  VerifyWhatsAppWebhookHandler,
  WhatsAppEmbeddedSignupChannelHandler,
] as const;

@Module({
  imports: [DatabaseModule, CacheModule, AuthModule, CrmModule, OrgAccessModule, MediaModule],
  controllers: [
    WhatsAppChannelsController,
    WhatsAppInboxController,
    WhatsAppCampaignsController,
    WhatsAppRealtimeController,
    WhatsAppWebhookController,
  ],
  providers: [
    ...whatsAppPersistenceProviders,
    ...whatsAppApplicationServices,
    ...whatsAppUseCaseHandlers,
    WhatsAppActorResolver,
    WhatsAppExceptionFilter,
  ],
})
export class WhatsAppModule {}
