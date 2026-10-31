import { Inject, Injectable, Logger } from '@nestjs/common';
import type { WhatsAppMessageView, WhatsAppSendMessageResponse } from '@techwin/contracts';
import type {
  WhatsAppSendMediaFields,
  WhatsAppSendTemplateRequest,
  WhatsAppSendTextRequest,
} from '@techwin/validation';
import {
  RATE_LIMITER,
  type RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';
import {
  WhatsAppForbiddenError,
  WhatsAppNotFoundError,
  WhatsAppPolicyError,
  WhatsAppProviderError,
  WhatsAppValidationError,
} from '../domain/whatsapp.errors.js';
import {
  baseMimeType,
  effectiveMediaLimit,
  isWithinServiceWindow,
  MAX_SEND_ATTEMPTS,
  mediaRuleFor,
  outboundMediaKind,
  retryDelayMs,
  contentMatchesMimeType,
} from '../domain/whatsapp-policy.js';
import {
  bindTemplateParameters,
  describeTemplate,
  renderTemplatePreview,
  type TemplateSendParameter,
} from '../domain/whatsapp-template.js';
import {
  WHATSAPP_MEDIA_STORE,
  WHATSAPP_PROVIDER,
  WHATSAPP_SETTINGS,
  type ProviderOutboundMessage,
  type WhatsAppMediaStorePort,
  type WhatsAppProviderCredentials,
  type WhatsAppProviderPort,
  type WhatsAppSettings,
} from '../domain/whatsapp.ports.js';
import {
  assertCanSeeConversation,
  enforceRateLimit,
  WHATSAPP_RATE_LIMITS,
  type WhatsAppActor,
} from './whatsapp-access.js';
import { WhatsAppRealtimeService } from './whatsapp-realtime.service.js';
import {
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_INBOX_STORE,
  WHATSAPP_MESSAGE_STORE,
  WHATSAPP_TEMPLATE_STORE,
  type ChannelCredentialsRecord,
  type ConversationAccessRecord,
  type CreateOutboundInput,
  type OutboundDeliveryJob,
  type WhatsAppChannelStore,
  type WhatsAppInboxStore,
  type WhatsAppMessageStore,
  type WhatsAppTemplateStore,
} from './whatsapp.stores.js';

export interface UploadedAttachment {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly size: number;
  readonly originalname: string;
}

interface ReplyContext {
  readonly record: ConversationAccessRecord;
  readonly channel: ChannelCredentialsRecord & { readonly accessToken: string };
}

const WINDOW_CLOSED =
  'The 24-hour customer service window has closed. Send an approved template to restart the conversation.';

function credentialsOf(
  channel: ChannelCredentialsRecord & { accessToken: string },
): WhatsAppProviderCredentials {
  return {
    accessToken: channel.accessToken,
    businessAccountId: channel.businessAccountId,
    phoneNumberId: channel.phoneNumberId,
  };
}

function safeFileName(name: string, extension: string): string {
  const cleaned = name
    .replace(/[^\w.\- ]+/g, '_')
    .trim()
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : `attachment.${extension}`;
}

@Injectable()
export class WhatsAppOutboundService {
  private readonly logger = new Logger(WhatsAppOutboundService.name);

  constructor(
    @Inject(WHATSAPP_MESSAGE_STORE) private readonly messages: WhatsAppMessageStore,
    @Inject(WHATSAPP_INBOX_STORE) private readonly inbox: WhatsAppInboxStore,
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_TEMPLATE_STORE) private readonly templates: WhatsAppTemplateStore,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(WHATSAPP_MEDIA_STORE) private readonly mediaStore: WhatsAppMediaStorePort,
    @Inject(WHATSAPP_SETTINGS) private readonly settings: WhatsAppSettings,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService,
  ) {}

  async sendText(
    actor: WhatsAppActor,
    conversationId: string,
    input: WhatsAppSendTextRequest,
  ): Promise<WhatsAppSendMessageResponse> {
    const context = await this.prepareReply(actor, conversationId);
    if (!isWithinServiceWindow(context.record.lastInboundAt, new Date())) {
      throw new WhatsAppPolicyError(WINDOW_CLOSED);
    }
    return this.enqueue(actor, context, {
      type: 'TEXT',
      body: input.body,
      payload: null,
      idempotencyKey: input.idempotencyKey,
      templateId: null,
      media: null,
    });
  }

  async sendMedia(
    actor: WhatsAppActor,
    conversationId: string,
    file: UploadedAttachment | undefined,
    fields: WhatsAppSendMediaFields,
  ): Promise<WhatsAppSendMessageResponse> {
    if (!file || file.size === 0) throw new WhatsAppValidationError('Attach a file to send.');
    const mimeType = baseMimeType(file.mimetype);
    const rule = mediaRuleFor(mimeType);
    const kind = outboundMediaKind(mimeType);
    if (!rule || !kind)
      throw new WhatsAppValidationError('WhatsApp does not support this file type.');
    if (!contentMatchesMimeType(mimeType, file.buffer)) {
      throw new WhatsAppValidationError("The file's contents do not match its type.");
    }
    const limit = effectiveMediaLimit(rule, this.settings.mediaMaxBytes);
    if (file.size > limit || file.buffer.length > limit) {
      throw new WhatsAppValidationError(
        `This file is too large. The limit for this type is ${Math.floor(limit / (1024 * 1024))} MB.`,
      );
    }

    const context = await this.prepareReply(actor, conversationId);
    if (!isWithinServiceWindow(context.record.lastInboundAt, new Date())) {
      throw new WhatsAppPolicyError(WINDOW_CLOSED);
    }

    const fileName = safeFileName(file.originalname, rule.extension);
    const stored = await this.mediaStore.store({
      organizationId: actor.organizationId,
      adminId: actor.adminId,
      buffer: file.buffer,
      mimeType,
      fileName,
      extension: rule.extension,
    });
    const uploaded = await this.withCredentialTracking(context.channel, () =>
      this.provider.uploadMedia(credentialsOf(context.channel), {
        buffer: file.buffer,
        mimeType,
        fileName,
      }),
    );
    return this.enqueue(actor, context, {
      type: kind,
      body: fields.caption ?? '',
      payload: null,
      idempotencyKey: fields.idempotencyKey,
      templateId: null,
      media: {
        storedObjectId: stored.storedObjectId,
        providerMediaId: uploaded.mediaId,
        mimeType,
        fileName,
        sizeBytes: stored.sizeBytes,
      },
    });
  }

  async sendTemplate(
    actor: WhatsAppActor,
    conversationId: string,
    input: WhatsAppSendTemplateRequest,
  ): Promise<WhatsAppSendMessageResponse> {
    const context = await this.prepareReply(actor, conversationId);
    const { record } = context;
    if (record.consentStatus === 'OPTED_OUT') {
      throw new WhatsAppPolicyError('This contact opted out of WhatsApp messages.');
    }
    if (
      !isWithinServiceWindow(record.lastInboundAt, new Date()) &&
      record.consentStatus !== 'OPTED_IN'
    ) {
      throw new WhatsAppPolicyError(
        'Record the contact’s WhatsApp opt-in before starting a conversation with a template.',
      );
    }
    const prepared = await this.prepareTemplate(
      actor.organizationId,
      record.channelId,
      input.templateId,
      input.variables,
    );
    return this.enqueue(actor, context, {
      type: 'TEMPLATE',
      body: prepared.preview,
      payload: prepared.payload,
      idempotencyKey: input.idempotencyKey,
      templateId: input.templateId,
      media: null,
    });
  }

  async retry(actor: WhatsAppActor, messageId: string): Promise<WhatsAppMessageView> {
    if (!actor.canReply) throw new WhatsAppForbiddenError('You cannot send WhatsApp messages.');
    const view = await this.inbox.getMessageView(actor.organizationId, messageId);
    if (!view) throw new WhatsAppNotFoundError('Message');
    const record = await this.inbox.getConversation(actor.organizationId, view.conversationId);
    if (!record) throw new WhatsAppNotFoundError('Conversation');
    assertCanSeeConversation(actor, record);
    if (view.type !== 'TEMPLATE' && !isWithinServiceWindow(record.lastInboundAt, new Date())) {
      throw new WhatsAppPolicyError(WINDOW_CLOSED);
    }
    const requeued = await this.messages.requeueFailed(actor.organizationId, messageId);
    if (!requeued)
      throw new WhatsAppPolicyError(
        'Only failed messages that never reached WhatsApp can be retried.',
      );
    this.realtime.notify(actor.organizationId);
    this.deliverInBackground(messageId);
    return this.messageView(actor.organizationId, messageId);
  }

  /**
   * Template body, Meta parameters and preview text. Throws when the template is
   * not approved, belongs to another channel, or the variable count is wrong.
   */
  async prepareTemplate(
    organizationId: string,
    channelId: string,
    templateId: string,
    variables: readonly string[],
  ): Promise<{ preview: string; payload: Record<string, unknown> }> {
    const template = await this.templates.getForSend(organizationId, templateId);
    if (!template || template.summary.channelId !== channelId)
      throw new WhatsAppNotFoundError('Template');
    if (template.summary.status !== 'APPROVED') {
      throw new WhatsAppPolicyError('Only templates approved by Meta can be sent.');
    }
    if (!template.summary.sendable) {
      throw new WhatsAppPolicyError(
        'This template uses media or buttons that cannot be sent from Techwin.',
      );
    }
    const description = describeTemplate(template.components);
    const parameters = bindTemplateParameters(description, variables);
    if (!parameters) {
      throw new WhatsAppValidationError(
        `This template needs ${description.parameters.length} variable value(s).`,
      );
    }
    return {
      preview: renderTemplatePreview(description, variables),
      payload: {
        templateName: template.summary.name,
        language: template.summary.language,
        parameters,
      },
    };
  }

  /** Sends one queued message. Safe to call concurrently: only the claiming worker sends. */
  async deliver(messageId: string): Promise<void> {
    if (!(await this.messages.claimForSending(messageId))) return;
    const job = await this.messages.getDeliveryJob(messageId);
    if (!job) return;
    try {
      const channel = await this.channels.getCredentialsForWorker(job.channelId);
      if (
        !channel ||
        channel.organizationId !== job.organizationId ||
        !channel.isActive ||
        !channel.accessToken
      ) {
        await this.messages.markFailed(
          messageId,
          'channel_unavailable',
          'The WhatsApp channel is disconnected.',
        );
        return;
      }
      const message = this.toProviderMessage(job);
      if (!message) {
        await this.messages.markFailed(
          messageId,
          'invalid_message',
          'This message could not be prepared for WhatsApp.',
        );
        return;
      }
      const active = { ...channel, accessToken: channel.accessToken };
      try {
        const { providerMessageId } = await this.withCredentialTracking(active, () =>
          this.provider.sendMessage(credentialsOf(active), job.toWaId, message),
        );
        await this.messages.markSent(messageId, providerMessageId);
      } catch (error) {
        if (!(error instanceof WhatsAppProviderError)) throw error;
        if (error.providerCode === 'timeout') {
          await this.messages.markFailed(
            messageId,
            'timeout',
            'Meta did not respond in time, so delivery is unknown. Check with the customer before retrying.',
          );
        } else if (error.retryable && job.attemptCount < MAX_SEND_ATTEMPTS) {
          await this.messages.markRetry(
            messageId,
            error.message,
            new Date(Date.now() + retryDelayMs(job.attemptCount)),
          );
        } else {
          await this.messages.markFailed(messageId, error.providerCode, error.message);
        }
      }
    } catch (error) {
      await this.messages.markRetry(
        messageId,
        error instanceof Error ? error.name : 'Unexpected error',
        new Date(Date.now() + retryDelayMs(job.attemptCount)),
      );
    } finally {
      this.realtime.notify(job.organizationId);
    }
  }

  private toProviderMessage(job: OutboundDeliveryJob): ProviderOutboundMessage | null {
    switch (job.type) {
      case 'TEXT':
        return job.body.trim() ? { kind: 'text', body: job.body } : null;
      case 'IMAGE':
      case 'VIDEO':
      case 'AUDIO':
      case 'DOCUMENT': {
        if (!job.mediaProviderId) return null;
        const mediaType = job.type.toLowerCase() as 'image' | 'video' | 'audio' | 'document';
        return {
          kind: 'media',
          mediaType,
          mediaId: job.mediaProviderId,
          ...(job.body && mediaType !== 'audio' ? { caption: job.body } : {}),
          ...(mediaType === 'document' && job.mediaFileName ? { fileName: job.mediaFileName } : {}),
        };
      }
      case 'TEMPLATE': {
        const payload = job.payload;
        const name = typeof payload?.templateName === 'string' ? payload.templateName : null;
        const language = typeof payload?.language === 'string' ? payload.language : null;
        const parameters = Array.isArray(payload?.parameters)
          ? (payload.parameters as TemplateSendParameter[])
          : [];
        return name && language ? { kind: 'template', name, language, parameters } : null;
      }
      default:
        return null;
    }
  }

  private async prepareReply(actor: WhatsAppActor, conversationId: string): Promise<ReplyContext> {
    if (!actor.canReply) throw new WhatsAppForbiddenError('You cannot send WhatsApp messages.');
    await enforceRateLimit(
      this.rateLimiter,
      WHATSAPP_RATE_LIMITS.send,
      `${actor.organizationId}:${actor.adminId}`,
    );
    const record = await this.inbox.getConversation(actor.organizationId, conversationId);
    if (!record) throw new WhatsAppNotFoundError('Conversation');
    assertCanSeeConversation(actor, record);
    if (record.status === 'SPAM') {
      throw new WhatsAppPolicyError(
        'This conversation is marked as spam. Reopen it before replying.',
      );
    }
    const channel = await this.channels.getCredentials(actor.organizationId, record.channelId);
    if (!channel || !channel.isActive || !channel.accessToken) {
      throw new WhatsAppPolicyError(
        'This WhatsApp channel is disconnected. Reconnect it to send messages.',
      );
    }
    return { record, channel: { ...channel, accessToken: channel.accessToken } };
  }

  private async enqueue(
    actor: WhatsAppActor,
    context: ReplyContext,
    message: Pick<
      CreateOutboundInput,
      'type' | 'body' | 'payload' | 'idempotencyKey' | 'templateId' | 'media'
    >,
  ): Promise<WhatsAppSendMessageResponse> {
    const { record } = context;
    if (
      record.assignedEmployeeId === null &&
      actor.employeeId &&
      (await this.inbox.isAssignableEmployee(actor.organizationId, actor.employeeId))
    ) {
      await this.inbox.assign(
        actor.organizationId,
        record.summary.id,
        actor.adminId,
        actor.employeeId,
        'first_reply',
      );
    }
    const { messageId, duplicate } = await this.messages.createOutbound({
      organizationId: actor.organizationId,
      conversationId: record.summary.id,
      adminId: actor.adminId,
      broadcastId: null,
      ...message,
    });
    this.realtime.notify(actor.organizationId);
    if (!duplicate) this.deliverInBackground(messageId);
    return { message: await this.messageView(actor.organizationId, messageId) };
  }

  /** The message is already persisted as QUEUED; the job runner retries if this attempt is lost. */
  deliverInBackground(messageId: string): void {
    setImmediate(() => {
      this.deliver(messageId).catch((error: unknown) => {
        this.logger.warn(
          `Background delivery failed for message ${messageId}: ${error instanceof Error ? error.name : 'unknown'}`,
        );
      });
    });
  }

  private async messageView(
    organizationId: string,
    messageId: string,
  ): Promise<WhatsAppMessageView> {
    const view = await this.inbox.getMessageView(organizationId, messageId);
    if (!view) throw new WhatsAppNotFoundError('Message');
    return view;
  }

  private async withCredentialTracking<T>(
    channel: ChannelCredentialsRecord,
    call: () => Promise<T>,
  ): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof WhatsAppProviderError && error.credentialProblem) {
        await this.channels.markCredentialProblem(channel.id, error.providerCode, error.message);
      }
      throw error;
    }
  }
}
