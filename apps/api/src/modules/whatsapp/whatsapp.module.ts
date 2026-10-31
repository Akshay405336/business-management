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
import { WhatsAppAnalyticsService } from './application/whatsapp-analytics.service.js';
import { WhatsAppBroadcastService } from './application/whatsapp-broadcast.service.js';
import { WhatsAppChannelService } from './application/whatsapp-channel.service.js';
import { WhatsAppInboxService } from './application/whatsapp-inbox.service.js';
import { WhatsAppJobRunner } from './application/whatsapp-job-runner.service.js';
import { WhatsAppOutboundService } from './application/whatsapp-outbound.service.js';
import { WhatsAppRealtimeService } from './application/whatsapp-realtime.service.js';
import { WhatsAppTemplateService } from './application/whatsapp-template.service.js';
import { WhatsAppWebhookProcessor } from './application/whatsapp-webhook-processor.service.js';
import { WhatsAppWebhookService } from './application/whatsapp-webhook.service.js';
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
} from './application/whatsapp.stores.js';
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
import { RedisWhatsAppLock } from './infrastructure/cache/redis-whatsapp-lock.js';
import { MetaCloudApiProvider } from './infrastructure/meta/meta-cloud-api.provider.js';
import { PrismaWhatsAppAnalyticsStore } from './infrastructure/persistence/prisma-whatsapp-analytics.store.js';
import { PrismaWhatsAppBroadcastStore } from './infrastructure/persistence/prisma-whatsapp-broadcast.store.js';
import { PrismaWhatsAppChannelStore } from './infrastructure/persistence/prisma-whatsapp-channel.store.js';
import { PrismaWhatsAppInboxStore } from './infrastructure/persistence/prisma-whatsapp-inbox.store.js';
import { PrismaWhatsAppMessageStore } from './infrastructure/persistence/prisma-whatsapp-message.store.js';
import { PrismaWhatsAppTemplateStore } from './infrastructure/persistence/prisma-whatsapp-template.store.js';
import { PrismaWhatsAppWebhookEventStore } from './infrastructure/persistence/prisma-whatsapp-webhook-event.store.js';
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
    WhatsAppActorResolver,
    WhatsAppExceptionFilter,
  ],
})
export class WhatsAppModule {}
