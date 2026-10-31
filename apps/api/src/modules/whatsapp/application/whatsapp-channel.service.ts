import { Inject, Injectable } from '@nestjs/common';
import type {
  WhatsAppChannelListResponse,
  WhatsAppChannelSummary,
  WhatsAppChannelTestResult,
  WhatsAppSetupInfo,
} from '@techwin/contracts';
import type {
  WhatsAppCreateChannelRequest,
  WhatsAppEmbeddedSignupRequest,
  WhatsAppRotateCredentialsRequest,
} from '@techwin/validation';
import {
  RATE_LIMITER,
  type RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';
import {
  WhatsAppNotConfiguredError,
  WhatsAppNotFoundError,
  WhatsAppProviderError,
  WhatsAppValidationError,
} from '../domain/whatsapp.errors.js';
import {
  WHATSAPP_CREDENTIAL_CIPHER,
  WHATSAPP_PROVIDER,
  WHATSAPP_SETTINGS,
  type ProviderPhoneNumberInfo,
  type WhatsAppCredentialCipherPort,
  type WhatsAppProviderPort,
  type WhatsAppSettings,
} from '../domain/whatsapp.ports.js';
import { enforceRateLimit, WHATSAPP_RATE_LIMITS, type WhatsAppActor } from './whatsapp-access.js';
import { WHATSAPP_CHANNEL_STORE, type WhatsAppChannelStore } from './whatsapp.stores.js';

type ChannelActor = Pick<WhatsAppActor, 'organizationId' | 'adminId'>;

@Injectable()
export class WhatsAppChannelService {
  constructor(
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(WHATSAPP_CREDENTIAL_CIPHER) private readonly cipher: WhatsAppCredentialCipherPort,
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  setupInfo(): WhatsAppSetupInfo {
    const { embeddedSignup } = this.settings;
    const missing: string[] = [];
    if (!embeddedSignup.appId) missing.push('META_APP_ID');
    if (!embeddedSignup.configId) missing.push('META_EMBEDDED_SIGNUP_CONFIG_ID');
    if (!embeddedSignup.hasAppSecret) missing.push('META_APP_SECRET');
    if (!this.cipher.isConfigured()) missing.push('WHATSAPP_CREDENTIALS_ENCRYPTION_KEY');
    return {
      webhookBaseUrl: this.settings.webhookBaseUrl,
      graphApiVersion: this.settings.graphApiVersion,
      credentialEncryptionConfigured: this.cipher.isConfigured(),
      embeddedSignup: {
        available: missing.length === 0,
        appId: embeddedSignup.appId,
        configId: embeddedSignup.configId,
        missing,
      },
    };
  }

  async list(organizationId: string): Promise<WhatsAppChannelListResponse> {
    return { channels: await this.channels.list(organizationId) };
  }

  async get(organizationId: string, id: string): Promise<WhatsAppChannelSummary> {
    const channel = await this.channels.getSummary(organizationId, id);
    if (!channel) throw new WhatsAppNotFoundError('WhatsApp channel');
    return channel;
  }

  async create(
    actor: ChannelActor,
    input: WhatsAppCreateChannelRequest,
  ): Promise<WhatsAppChannelTestResult> {
    await this.guardAdminAction(actor);
    return this.connect(actor, {
      name: input.name,
      connectionMethod: 'MANUAL',
      metaAppId: input.metaAppId ?? null,
      businessAccountId: input.businessAccountId,
      phoneNumberId: input.phoneNumberId,
      accessToken: input.accessToken,
      appSecret: input.appSecret ?? null,
      verifyToken: input.verifyToken,
    });
  }

  async embeddedSignup(
    actor: ChannelActor,
    input: WhatsAppEmbeddedSignupRequest,
  ): Promise<WhatsAppChannelTestResult> {
    const setup = this.setupInfo();
    if (!setup.embeddedSignup.available) {
      throw new WhatsAppNotConfiguredError(
        `Embedded Signup is not configured. Missing: ${setup.embeddedSignup.missing.join(', ')}.`,
      );
    }
    await this.guardAdminAction(actor);
    const { accessToken } = await this.provider.exchangeEmbeddedSignupCode(input.code);
    return this.connect(actor, {
      name: input.name,
      connectionMethod: 'EMBEDDED_SIGNUP',
      metaAppId: this.settings.embeddedSignup.appId,
      businessAccountId: input.businessAccountId,
      phoneNumberId: input.phoneNumberId,
      accessToken,
      appSecret: null,
      verifyToken: input.verifyToken,
    });
  }

  async rename(actor: ChannelActor, id: string, name: string): Promise<WhatsAppChannelSummary> {
    await this.channels.rename(actor.organizationId, actor.adminId, id, name);
    return this.get(actor.organizationId, id);
  }

  async test(actor: ChannelActor, id: string): Promise<WhatsAppChannelTestResult> {
    await this.guardAdminAction(actor);
    return this.verifyAndRecord(actor.organizationId, id);
  }

  async rotateCredentials(
    actor: ChannelActor,
    id: string,
    input: WhatsAppRotateCredentialsRequest,
  ): Promise<WhatsAppChannelTestResult> {
    await this.guardAdminAction(actor);
    this.assertEncryptionConfigured();
    await this.channels.rotateCredentials(actor.organizationId, actor.adminId, id, {
      ...(input.accessToken ? { accessToken: input.accessToken } : {}),
      ...(input.appSecret ? { appSecret: input.appSecret } : {}),
      ...(input.verifyToken ? { verifyToken: input.verifyToken } : {}),
    });
    if (input.accessToken) return this.verifyAndRecord(actor.organizationId, id);
    const channel = await this.get(actor.organizationId, id);
    return { ok: true, channel, message: 'Credentials updated.' };
  }

  async disconnect(actor: ChannelActor, id: string): Promise<WhatsAppChannelSummary> {
    await this.channels.disconnect(actor.organizationId, actor.adminId, id);
    return this.get(actor.organizationId, id);
  }

  async remove(actor: ChannelActor, id: string): Promise<void> {
    await this.channels.softDelete(actor.organizationId, actor.adminId, id);
  }

  private async connect(
    actor: ChannelActor,
    input: {
      name: string;
      connectionMethod: 'MANUAL' | 'EMBEDDED_SIGNUP';
      metaAppId: string | null;
      businessAccountId: string;
      phoneNumberId: string;
      accessToken: string;
      appSecret: string | null;
      verifyToken: string;
    },
  ): Promise<WhatsAppChannelTestResult> {
    this.assertEncryptionConfigured();
    await this.channels.assertPhoneNumberAvailable(input.phoneNumberId);
    const credentials = {
      accessToken: input.accessToken,
      businessAccountId: input.businessAccountId,
      phoneNumberId: input.phoneNumberId,
    };

    // Reject credentials Meta refuses before anything is stored; transient outages still save the channel.
    let info: ProviderPhoneNumberInfo | null = null;
    let pendingError: WhatsAppProviderError | null = null;
    try {
      info = await this.provider.verifyPhoneNumber(credentials);
    } catch (error) {
      if (!(error instanceof WhatsAppProviderError)) throw error;
      if (!error.retryable) {
        throw new WhatsAppValidationError(`Meta rejected these credentials: ${error.message}`);
      }
      pendingError = error;
    }

    const { id } = await this.channels.create({
      organizationId: actor.organizationId,
      adminId: actor.adminId,
      ...input,
    });

    if (!info) {
      await this.channels.recordVerification(actor.organizationId, id, {
        ok: false,
        code: pendingError?.providerCode ?? null,
        message: pendingError?.message ?? 'Meta could not be reached.',
        credentialProblem: false,
      });
      const channel = await this.get(actor.organizationId, id);
      return {
        ok: false,
        channel,
        message:
          'Channel saved, but Meta could not be reached to verify it. Use "Test connection" to retry.',
      };
    }
    return this.verifyAndRecord(actor.organizationId, id);
  }

  private async verifyAndRecord(
    organizationId: string,
    id: string,
  ): Promise<WhatsAppChannelTestResult> {
    const credentials = await this.channels.getCredentials(organizationId, id);
    if (!credentials) throw new WhatsAppNotFoundError('WhatsApp channel');
    if (!credentials.accessToken) {
      throw new WhatsAppNotConfiguredError(
        'This channel has no access token. Rotate credentials to reconnect it.',
      );
    }
    const providerCredentials = {
      accessToken: credentials.accessToken,
      businessAccountId: credentials.businessAccountId,
      phoneNumberId: credentials.phoneNumberId,
    };
    try {
      const info = await this.provider.verifyPhoneNumber(providerCredentials);
      await this.provider.subscribeApp(providerCredentials);
      await this.channels.recordVerification(organizationId, id, { ok: true, info });
      const channel = await this.get(organizationId, id);
      return {
        ok: true,
        channel,
        message:
          channel.status === 'CONNECTED'
            ? 'Connected to the WhatsApp Cloud API.'
            : 'Credentials verified. Configure the webhook in Meta to finish setup.',
      };
    } catch (error) {
      if (!(error instanceof WhatsAppProviderError)) throw error;
      await this.channels.recordVerification(organizationId, id, {
        ok: false,
        code: error.providerCode,
        message: error.message,
        credentialProblem: error.credentialProblem,
      });
      const channel = await this.get(organizationId, id);
      return { ok: false, channel, message: error.message };
    }
  }

  private assertEncryptionConfigured(): void {
    if (!this.cipher.isConfigured()) {
      throw new WhatsAppNotConfiguredError(
        'Credential encryption is not configured. Set WHATSAPP_CREDENTIALS_ENCRYPTION_KEY on the server.',
      );
    }
  }

  private guardAdminAction(actor: ChannelActor): Promise<void> {
    return enforceRateLimit(
      this.rateLimiter,
      WHATSAPP_RATE_LIMITS.channelAdmin,
      `${actor.organizationId}:${actor.adminId}`,
    );
  }
}
