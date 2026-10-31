import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  WhatsAppAssigneesResponse,
  WhatsAppConversationDetail,
  WhatsAppConversationListResponse,
  WhatsAppFolderCounts,
  WhatsAppTimelineResponse,
} from '@techwin/contracts';
import type {
  WhatsAppAssignRequest,
  WhatsAppConsentRequest,
  WhatsAppConversationListQuery,
  WhatsAppConversationStatusRequest,
  WhatsAppCrmLinkRequest,
  WhatsAppStartConversationRequest,
  WhatsAppTimelineQuery,
} from '@techwin/validation';
import {
  WhatsAppForbiddenError,
  WhatsAppNotFoundError,
  WhatsAppValidationError,
} from '../domain/whatsapp.errors.js';
import { normalizeWhatsAppNumber } from '../domain/whatsapp-phone.js';
import {
  WHATSAPP_MEDIA_STORE,
  WHATSAPP_PROVIDER,
  type WhatsAppMediaStorePort,
  type WhatsAppProviderPort,
} from '../domain/whatsapp.ports.js';
import {
  assertCanSeeConversation,
  canSeeConversation,
  inboxScope,
  type WhatsAppActor,
} from './whatsapp-access.js';
import { WhatsAppRealtimeService } from './whatsapp-realtime.service.js';
import {
  WHATSAPP_CHANNEL_STORE,
  WHATSAPP_INBOX_STORE,
  WHATSAPP_MESSAGE_STORE,
  type ConversationAccessRecord,
  type WhatsAppChannelStore,
  type WhatsAppInboxStore,
  type WhatsAppMessageStore,
} from './whatsapp.stores.js';

export interface OpenedWhatsAppMedia {
  readonly redirectUrl?: string;
  readonly stream?: { readonly body: Buffer; readonly contentType: string };
  readonly fileName: string | null;
}

@Injectable()
export class WhatsAppInboxService {
  private readonly logger = new Logger(WhatsAppInboxService.name);

  constructor(
    @Inject(WHATSAPP_INBOX_STORE) private readonly inbox: WhatsAppInboxStore,
    @Inject(WHATSAPP_MESSAGE_STORE) private readonly messages: WhatsAppMessageStore,
    @Inject(WHATSAPP_CHANNEL_STORE) private readonly channels: WhatsAppChannelStore,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(WHATSAPP_MEDIA_STORE) private readonly mediaStore: WhatsAppMediaStorePort,
    @Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService,
  ) {}

  resolveEmployeeId(organizationId: string, adminId: string): Promise<string | null> {
    return this.inbox.resolveEmployeeId(organizationId, adminId);
  }

  list(
    actor: WhatsAppActor,
    query: WhatsAppConversationListQuery,
  ): Promise<WhatsAppConversationListResponse> {
    if (query.folder === 'mine' && !actor.employeeId)
      return Promise.resolve({ items: [], nextCursor: null });
    return this.inbox.listConversations(actor.organizationId, inboxScope(actor), query);
  }

  counts(actor: WhatsAppActor): Promise<WhatsAppFolderCounts> {
    return this.inbox.folderCounts(actor.organizationId, inboxScope(actor));
  }

  async detail(actor: WhatsAppActor, conversationId: string): Promise<WhatsAppConversationDetail> {
    const record = await this.accessible(actor, conversationId);
    return {
      conversation: record.summary,
      canReply: actor.canReply && record.status !== 'SPAM',
      canAssign:
        actor.canAssign ||
        (actor.canReply && record.assignedEmployeeId === null && actor.employeeId !== null),
    };
  }

  async timeline(
    actor: WhatsAppActor,
    conversationId: string,
    query: WhatsAppTimelineQuery,
  ): Promise<WhatsAppTimelineResponse> {
    await this.accessible(actor, conversationId);
    return this.inbox.timeline(actor.organizationId, conversationId, query);
  }

  /** Internal notes are stored as conversation events and are never sent to WhatsApp. */
  async addNote(actor: WhatsAppActor, conversationId: string, body: string): Promise<void> {
    await this.accessible(actor, conversationId);
    await this.inbox.addNote(actor.organizationId, conversationId, actor.adminId, body);
    this.realtime.notify(actor.organizationId);
  }

  async assign(
    actor: WhatsAppActor,
    conversationId: string,
    input: WhatsAppAssignRequest,
  ): Promise<WhatsAppConversationDetail> {
    const record = await this.accessible(actor, conversationId);
    const selfTake =
      input.employeeId !== null &&
      input.employeeId === actor.employeeId &&
      record.assignedEmployeeId === null &&
      actor.canReply;
    if (!actor.canAssign && !selfTake) {
      throw new WhatsAppForbiddenError('You cannot reassign WhatsApp conversations.');
    }
    if (
      input.employeeId &&
      !(await this.inbox.isAssignableEmployee(actor.organizationId, input.employeeId))
    ) {
      throw new WhatsAppValidationError(
        'Choose an active employee with access to this organization.',
      );
    }
    await this.inbox.assign(
      actor.organizationId,
      conversationId,
      actor.adminId,
      input.employeeId,
      input.reason ?? null,
    );
    this.realtime.notify(actor.organizationId);
    return this.detailAfterChange(actor, conversationId);
  }

  async setStatus(
    actor: WhatsAppActor,
    conversationId: string,
    input: WhatsAppConversationStatusRequest,
  ): Promise<WhatsAppConversationDetail> {
    await this.accessible(actor, conversationId);
    if (!actor.canReply && !actor.canAssign) {
      throw new WhatsAppForbiddenError('You cannot change conversation status.');
    }
    await this.inbox.setStatus(actor.organizationId, conversationId, actor.adminId, input.status);
    this.realtime.notify(actor.organizationId);
    return this.detailAfterChange(actor, conversationId);
  }

  /** Clears the unread badge and sends a read receipt for the latest customer message (best effort). */
  async markRead(actor: WhatsAppActor, conversationId: string): Promise<void> {
    const record = await this.accessible(actor, conversationId);
    const changed = await this.inbox.markRead(actor.organizationId, conversationId);
    if (!changed) return;
    this.realtime.notify(actor.organizationId);
    if (!actor.canReply || !record.lastInboundProviderMessageId) return;
    const channel = await this.channels.getCredentials(actor.organizationId, record.channelId);
    if (!channel?.isActive || !channel.accessToken) return;
    try {
      await this.provider.markRead(
        {
          accessToken: channel.accessToken,
          businessAccountId: channel.businessAccountId,
          phoneNumberId: channel.phoneNumberId,
        },
        record.lastInboundProviderMessageId,
      );
    } catch (error) {
      this.logger.debug(
        `Read receipt not sent: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async setConsent(
    actor: WhatsAppActor,
    contactId: string,
    input: WhatsAppConsentRequest,
  ): Promise<void> {
    if (!actor.canReply) throw new WhatsAppForbiddenError('You cannot change WhatsApp consent.');
    await this.inbox.setConsent(
      actor.organizationId,
      contactId,
      actor.adminId,
      input.status,
      input.source,
    );
    this.realtime.notify(actor.organizationId);
  }

  /** Links are only changed by an explicit staff action, never inferred from message content. */
  async setCrmLink(
    actor: WhatsAppActor,
    contactId: string,
    input: WhatsAppCrmLinkRequest,
  ): Promise<void> {
    if (!actor.canReply) throw new WhatsAppForbiddenError('You cannot change CRM links.');
    await this.inbox.setCrmLink(
      actor.organizationId,
      contactId,
      actor.adminId,
      input.kind,
      input.id,
    );
    this.realtime.notify(actor.organizationId);
  }

  async startConversation(
    actor: WhatsAppActor,
    input: WhatsAppStartConversationRequest,
  ): Promise<WhatsAppConversationDetail> {
    if (!actor.canReply)
      throw new WhatsAppForbiddenError('You cannot start WhatsApp conversations.');
    const waId = normalizeWhatsAppNumber(input.phone);
    if (!waId) {
      throw new WhatsAppValidationError(
        'Enter the full number with country code, for example +971501234567.',
      );
    }
    const channel = await this.channels.getCredentials(actor.organizationId, input.channelId);
    if (!channel || !channel.isActive) throw new WhatsAppNotFoundError('WhatsApp channel');
    const { conversationId } = await this.inbox.startConversation({
      organizationId: actor.organizationId,
      adminId: actor.adminId,
      channelId: channel.id,
      waId,
      profileName: input.profileName ?? '',
      leadId: input.leadId ?? null,
      clientId: input.clientId ?? null,
    });
    const record = await this.inbox.getConversation(actor.organizationId, conversationId);
    if (record && record.assignedEmployeeId === null && actor.employeeId) {
      if (await this.inbox.isAssignableEmployee(actor.organizationId, actor.employeeId)) {
        await this.inbox.assign(
          actor.organizationId,
          conversationId,
          actor.adminId,
          actor.employeeId,
          'started',
        );
      }
    }
    this.realtime.notify(actor.organizationId);
    return this.detailAfterChange(actor, conversationId);
  }

  async assignees(actor: WhatsAppActor): Promise<WhatsAppAssigneesResponse> {
    return {
      assignees: await this.inbox.listAssignees(actor.organizationId),
      currentEmployeeId: actor.employeeId,
    };
  }

  async openMedia(actor: WhatsAppActor, messageId: string): Promise<OpenedWhatsAppMedia> {
    const ref = await this.messages.getMediaRef(actor.organizationId, messageId);
    if (!ref?.storedObjectId) throw new WhatsAppNotFoundError('Media');
    await this.accessible(actor, ref.conversationId);
    const opened = await this.mediaStore.open(actor.organizationId, ref.storedObjectId);
    return { ...opened, fileName: ref.fileName };
  }

  private async accessible(
    actor: WhatsAppActor,
    conversationId: string,
  ): Promise<ConversationAccessRecord> {
    const record = await this.inbox.getConversation(actor.organizationId, conversationId);
    if (!record) throw new WhatsAppNotFoundError('Conversation');
    assertCanSeeConversation(actor, record);
    return record;
  }

  /** After reassignment the caller may lose access; return the state they are still allowed to see. */
  private async detailAfterChange(
    actor: WhatsAppActor,
    conversationId: string,
  ): Promise<WhatsAppConversationDetail> {
    const record = await this.inbox.getConversation(actor.organizationId, conversationId);
    if (!record) throw new WhatsAppNotFoundError('Conversation');
    const visible = canSeeConversation(actor, record);
    return {
      conversation: record.summary,
      canReply: visible && actor.canReply && record.status !== 'SPAM',
      canAssign:
        visible &&
        (actor.canAssign ||
          (actor.canReply && record.assignedEmployeeId === null && actor.employeeId !== null)),
    };
  }
}
