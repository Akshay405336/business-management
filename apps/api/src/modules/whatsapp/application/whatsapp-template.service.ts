import { Inject, Injectable } from '@nestjs/common';
import type {
  WhatsAppTemplateListResponse,
  WhatsAppTemplateSummary,
  WhatsAppTemplateSyncResponse,
} from '@techwin/contracts';
import type { WhatsAppCreateTemplateRequest, WhatsAppTemplateListQuery } from '@techwin/validation';
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
import { templatePlaceholders } from '../domain/whatsapp-policy.js';
import { WHATSAPP_PROVIDER, type WhatsAppProviderPort } from '../domain/whatsapp.ports.js';
import { enforceRateLimit, WHATSAPP_RATE_LIMITS, type WhatsAppActor } from './whatsapp-access.js';
import {
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_TEMPLATE_STORE,
  type ChannelCredentialsRecord,
  type WhatsAppChannelStore,
  type WhatsAppTemplateStore,
} from './whatsapp.stores.js';

type TemplateActor = Pick<WhatsAppActor, 'organizationId' | 'adminId'>;

@Injectable()
export class WhatsAppTemplateService {
  constructor(
    @Inject(WHATSAPP_TEMPLATE_STORE) private readonly templates: WhatsAppTemplateStore,
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async list(
    organizationId: string,
    query: WhatsAppTemplateListQuery,
  ): Promise<WhatsAppTemplateListResponse> {
    return { templates: await this.templates.list(organizationId, query) };
  }

  async get(organizationId: string, id: string): Promise<WhatsAppTemplateSummary> {
    const template = await this.templates.get(organizationId, id);
    if (!template) throw new WhatsAppNotFoundError('Template');
    return template;
  }

  /** Mirrors the business account's templates and their Meta review status. */
  async sync(actor: TemplateActor, channelId: string): Promise<WhatsAppTemplateSyncResponse> {
    await enforceRateLimit(
      this.rateLimiter,
      WHATSAPP_RATE_LIMITS.channelAdmin,
      `${actor.organizationId}:${actor.adminId}`,
    );
    const channel = await this.activeChannel(actor.organizationId, channelId);
    const remote = await this.callProvider(channel, (credentials) =>
      this.provider.listTemplates(credentials),
    );
    const at = new Date();
    const result = await this.templates.replaceSynced(actor.organizationId, channel.id, remote, at);
    await this.channels.markTemplatesSynced(actor.organizationId, channel.id, at);
    return { ...result, templatesSyncedAt: at.toISOString() };
  }

  /** Submits a text template for Meta review. Status stays as Meta reports it (usually PENDING). */
  async submit(
    actor: TemplateActor,
    input: WhatsAppCreateTemplateRequest,
  ): Promise<WhatsAppTemplateSummary> {
    await enforceRateLimit(
      this.rateLimiter,
      WHATSAPP_RATE_LIMITS.templateSubmit,
      `${actor.organizationId}:${actor.adminId}`,
    );
    const channel = await this.activeChannel(actor.organizationId, input.channelId);

    if (input.headerText && templatePlaceholders(input.headerText).length > 0) {
      throw new WhatsAppValidationError(
        'Header variables are not supported. Use variables in the body.',
      );
    }
    const placeholders = templatePlaceholders(input.bodyText);
    const expected = placeholders.map((_, index) => String(index + 1));
    if (placeholders.some((name, index) => name !== expected[index])) {
      throw new WhatsAppValidationError('Number body variables in order: {{1}}, {{2}}, {{3}}…');
    }
    if (input.bodyExamples.length !== placeholders.length) {
      throw new WhatsAppValidationError(
        `Provide one example value for each of the ${placeholders.length} body variable(s).`,
      );
    }

    const components: Record<string, unknown>[] = [];
    if (input.headerText)
      components.push({ type: 'HEADER', format: 'TEXT', text: input.headerText });
    components.push({
      type: 'BODY',
      text: input.bodyText,
      ...(placeholders.length > 0 ? { example: { body_text: [input.bodyExamples] } } : {}),
    });
    if (input.footerText) components.push({ type: 'FOOTER', text: input.footerText });

    const created = await this.callProvider(channel, (credentials) =>
      this.provider.createTemplate(credentials, {
        name: input.name,
        language: input.language,
        category: input.category,
        components,
      }),
    );
    return this.templates.recordSubmitted(actor.organizationId, actor.adminId, channel.id, {
      id: created.id,
      name: input.name,
      language: input.language,
      category: created.category || input.category,
      status: created.status || 'PENDING',
      rejectedReason: null,
      qualityScore: null,
      components,
    });
  }

  private async activeChannel(
    organizationId: string,
    channelId: string,
  ): Promise<ChannelCredentialsRecord> {
    const channel = await this.channels.getCredentials(organizationId, channelId);
    if (!channel) throw new WhatsAppNotFoundError('WhatsApp channel');
    if (!channel.isActive || !channel.accessToken) {
      throw new WhatsAppNotConfiguredError(
        'This channel is disconnected. Rotate its access token first.',
      );
    }
    return channel;
  }

  private async callProvider<T>(
    channel: ChannelCredentialsRecord,
    call: (credentials: {
      accessToken: string;
      businessAccountId: string;
      phoneNumberId: string;
    }) => Promise<T>,
  ): Promise<T> {
    try {
      return await call({
        accessToken: channel.accessToken ?? '',
        businessAccountId: channel.businessAccountId,
        phoneNumberId: channel.phoneNumberId,
      });
    } catch (error) {
      if (error instanceof WhatsAppProviderError && error.credentialProblem) {
        await this.channels.markCredentialProblem(channel.id, error.providerCode, error.message);
      }
      throw error;
    }
  }
}
