import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  WhatsAppAssigneesResponse,
  WhatsAppConversationDetail,
  WhatsAppConversationListResponse,
  WhatsAppFolderCounts,
  WhatsAppMessageView,
  WhatsAppSendMessageResponse,
  WhatsAppTimelineResponse,
} from '@techwin/contracts';
import {
  whatsappAddNoteRequestSchema,
  whatsappAssignRequestSchema,
  whatsappConsentRequestSchema,
  whatsappConversationListQuerySchema,
  whatsappConversationStatusRequestSchema,
  whatsappCrmLinkRequestSchema,
  whatsappSendMediaFieldsSchema,
  whatsappSendTemplateRequestSchema,
  whatsappSendTextRequestSchema,
  whatsappStartConversationRequestSchema,
  whatsappTimelineQuerySchema,
} from '@techwin/validation';
import type { Request, Response } from 'express';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import { CrmOrganizationGuard } from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { AddWhatsAppConversationNoteHandler } from '../../../application/add-whatsapp-conversation-note/add-whatsapp-conversation-note.handler.js';
import { AssignWhatsAppConversationHandler } from '../../../application/assign-whatsapp-conversation/assign-whatsapp-conversation.handler.js';
import { GetWhatsAppConversationHandler } from '../../../application/get-whatsapp-conversation/get-whatsapp-conversation.handler.js';
import { GetWhatsAppConversationCountsHandler } from '../../../application/get-whatsapp-conversation-counts/get-whatsapp-conversation-counts.handler.js';
import { GetWhatsAppConversationTimelineHandler } from '../../../application/get-whatsapp-conversation-timeline/get-whatsapp-conversation-timeline.handler.js';
import { ListWhatsAppAssigneesHandler } from '../../../application/list-whatsapp-assignees/list-whatsapp-assignees.handler.js';
import { ListWhatsAppConversationsHandler } from '../../../application/list-whatsapp-conversations/list-whatsapp-conversations.handler.js';
import { MarkWhatsAppConversationReadHandler } from '../../../application/mark-whatsapp-conversation-read/mark-whatsapp-conversation-read.handler.js';
import { OpenWhatsAppMessageMediaHandler } from '../../../application/open-whatsapp-message-media/open-whatsapp-message-media.handler.js';
import { RetryWhatsAppMessageHandler } from '../../../application/retry-whatsapp-message/retry-whatsapp-message.handler.js';
import { SendWhatsAppMediaMessageHandler } from '../../../application/send-whatsapp-media-message/send-whatsapp-media-message.handler.js';
import { SendWhatsAppTemplateMessageHandler } from '../../../application/send-whatsapp-template-message/send-whatsapp-template-message.handler.js';
import { SendWhatsAppTextMessageHandler } from '../../../application/send-whatsapp-text-message/send-whatsapp-text-message.handler.js';
import { SetWhatsAppContactConsentHandler } from '../../../application/set-whatsapp-contact-consent/set-whatsapp-contact-consent.handler.js';
import { SetWhatsAppContactCrmLinkHandler } from '../../../application/set-whatsapp-contact-crm-link/set-whatsapp-contact-crm-link.handler.js';
import { SetWhatsAppConversationStatusHandler } from '../../../application/set-whatsapp-conversation-status/set-whatsapp-conversation-status.handler.js';
import { StartWhatsAppConversationHandler } from '../../../application/start-whatsapp-conversation/start-whatsapp-conversation.handler.js';
import type { UploadedAttachment } from '../../../application/services/whatsapp-outbound.service.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';
import { WhatsAppActorResolver } from '../whatsapp-actor.resolver.js';

/** Hard ceiling for multipart uploads; the configured per-type limit is enforced by the service. */
const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

@ApiTags('WhatsApp Inbox')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppInboxController {
  constructor(
    @Inject(ListWhatsAppConversationsHandler)
    private readonly listConversations: ListWhatsAppConversationsHandler,
    @Inject(GetWhatsAppConversationCountsHandler)
    private readonly conversationCounts: GetWhatsAppConversationCountsHandler,
    @Inject(StartWhatsAppConversationHandler)
    private readonly startConversation: StartWhatsAppConversationHandler,
    @Inject(GetWhatsAppConversationHandler) private readonly getConversation: GetWhatsAppConversationHandler,
    @Inject(GetWhatsAppConversationTimelineHandler)
    private readonly conversationTimeline: GetWhatsAppConversationTimelineHandler,
    @Inject(SendWhatsAppTextMessageHandler) private readonly sendTextMessage: SendWhatsAppTextMessageHandler,
    @Inject(SendWhatsAppMediaMessageHandler) private readonly sendMediaMessage: SendWhatsAppMediaMessageHandler,
    @Inject(SendWhatsAppTemplateMessageHandler)
    private readonly sendTemplateMessage: SendWhatsAppTemplateMessageHandler,
    @Inject(AddWhatsAppConversationNoteHandler) private readonly addNote: AddWhatsAppConversationNoteHandler,
    @Inject(AssignWhatsAppConversationHandler) private readonly assignConversation: AssignWhatsAppConversationHandler,
    @Inject(SetWhatsAppConversationStatusHandler)
    private readonly setConversationStatus: SetWhatsAppConversationStatusHandler,
    @Inject(MarkWhatsAppConversationReadHandler)
    private readonly markConversationRead: MarkWhatsAppConversationReadHandler,
    @Inject(OpenWhatsAppMessageMediaHandler) private readonly openMessageMedia: OpenWhatsAppMessageMediaHandler,
    @Inject(RetryWhatsAppMessageHandler) private readonly retryMessage: RetryWhatsAppMessageHandler,
    @Inject(SetWhatsAppContactConsentHandler) private readonly setContactConsent: SetWhatsAppContactConsentHandler,
    @Inject(SetWhatsAppContactCrmLinkHandler) private readonly setContactCrmLink: SetWhatsAppContactCrmLinkHandler,
    @Inject(ListWhatsAppAssigneesHandler) private readonly listAssignees: ListWhatsAppAssigneesHandler,
    @Inject(WhatsAppActorResolver) private readonly actors: WhatsAppActorResolver,
  ) {}

  @Get('conversations')
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'List conversations visible to the caller' })
  async list(@Req() request: Request): Promise<WhatsAppConversationListResponse> {
    const actor = await this.actors.resolve(request);
    return this.listConversations.execute({
      actor,
      query: whatsappConversationListQuerySchema.parse(request.query),
    });
  }

  @Get('conversations/counts')
  @RequirePermissions('whatsapp.read')
  async counts(@Req() request: Request): Promise<WhatsAppFolderCounts> {
    return this.conversationCounts.execute({ actor: await this.actors.resolve(request) });
  }

  @Post('conversations')
  @RequirePermissions('whatsapp.reply')
  @ApiOperation({ summary: 'Start a conversation with a phone number' })
  async start(@Req() request: Request, @Body() raw: unknown): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.startConversation.execute({
      actor,
      input: whatsappStartConversationRequestSchema.parse(raw),
    });
  }

  @Get('conversations/:id')
  @RequirePermissions('whatsapp.read')
  async detail(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppConversationDetail> {
    return this.getConversation.execute({
      actor: await this.actors.resolve(request),
      conversationId: id,
    });
  }

  @Get('conversations/:id/timeline')
  @RequirePermissions('whatsapp.read')
  async timeline(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTimelineResponse> {
    const actor = await this.actors.resolve(request);
    return this.conversationTimeline.execute({
      actor,
      conversationId: id,
      query: whatsappTimelineQuerySchema.parse(request.query),
    });
  }

  @Post('conversations/:id/messages')
  @RequirePermissions('whatsapp.reply')
  @ApiOperation({ summary: 'Send a text reply (within the 24-hour window)' })
  async sendText(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppSendMessageResponse> {
    const actor = await this.actors.resolve(request);
    return this.sendTextMessage.execute({
      actor,
      conversationId: id,
      input: whatsappSendTextRequestSchema.parse(raw),
    });
  }

  @Post('conversations/:id/media-messages')
  @RequirePermissions('whatsapp.reply')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiOperation({ summary: 'Send an attachment (within the 24-hour window)' })
  async sendMedia(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedAttachment | undefined,
    @Body() raw: unknown,
  ): Promise<WhatsAppSendMessageResponse> {
    const actor = await this.actors.resolve(request);
    return this.sendMediaMessage.execute({
      actor,
      conversationId: id,
      file,
      fields: whatsappSendMediaFieldsSchema.parse(raw),
    });
  }

  @Post('conversations/:id/template-messages')
  @RequirePermissions('whatsapp.reply')
  @ApiOperation({ summary: 'Send an approved template' })
  async sendTemplate(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppSendMessageResponse> {
    const actor = await this.actors.resolve(request);
    return this.sendTemplateMessage.execute({
      actor,
      conversationId: id,
      input: whatsappSendTemplateRequestSchema.parse(raw),
    });
  }

  @Post('conversations/:id/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'Add an internal note (never sent to WhatsApp)' })
  async addConversationNote(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<void> {
    const actor = await this.actors.resolve(request);
    await this.addNote.execute({
      actor,
      conversationId: id,
      body: whatsappAddNoteRequestSchema.parse(raw).body,
    });
  }

  @Patch('conversations/:id/assignment')
  @RequirePermissions('whatsapp.assign', 'whatsapp.reply')
  async assign(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.assignConversation.execute({
      actor,
      conversationId: id,
      input: whatsappAssignRequestSchema.parse(raw),
    });
  }

  @Patch('conversations/:id/status')
  @RequirePermissions('whatsapp.reply', 'whatsapp.assign')
  async setStatus(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.setConversationStatus.execute({
      actor,
      conversationId: id,
      input: whatsappConversationStatusRequestSchema.parse(raw),
    });
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.read')
  async markRead(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.markConversationRead.execute({
      actor: await this.actors.resolve(request),
      conversationId: id,
    });
  }

  @Get('messages/:id/media')
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'Download message media after an access check' })
  async media(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const opened = await this.openMessageMedia.execute({
      actor: await this.actors.resolve(request),
      messageId: id,
    });
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (opened.redirectUrl) {
      // Browsers cannot read the Location of a manual redirect, so API clients get the short-lived URL as JSON.
      if (request.accepts(['image/*', 'application/json']) === 'application/json') {
        response.setHeader('Cache-Control', 'no-store');
        response.json({ url: opened.redirectUrl });
        return;
      }
      response.setHeader('Cache-Control', 'private, max-age=60');
      response.redirect(HttpStatus.TEMPORARY_REDIRECT, opened.redirectUrl);
      return;
    }
    response.setHeader('Cache-Control', 'private, max-age=60');
    if (opened.stream) {
      response.setHeader('Content-Type', opened.stream.contentType);
      response.setHeader('Content-Disposition', 'inline');
      response.send(opened.stream.body);
      return;
    }
    response.status(HttpStatus.NOT_FOUND).end();
  }

  @Post('messages/:id/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.reply')
  async retry(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppMessageView> {
    return this.retryMessage.execute({ actor: await this.actors.resolve(request), messageId: id });
  }

  @Patch('contacts/:id/consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.reply')
  @ApiOperation({ summary: 'Record WhatsApp opt-in or opt-out with its source' })
  async consent(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<void> {
    const actor = await this.actors.resolve(request);
    await this.setContactConsent.execute({
      actor,
      contactId: id,
      input: whatsappConsentRequestSchema.parse(raw),
    });
  }

  @Patch('contacts/:id/crm-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.reply')
  async crmLink(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<void> {
    const actor = await this.actors.resolve(request);
    await this.setContactCrmLink.execute({
      actor,
      contactId: id,
      input: whatsappCrmLinkRequestSchema.parse(raw),
    });
  }

  @Get('assignees')
  @RequirePermissions('whatsapp.read')
  async assignees(@Req() request: Request): Promise<WhatsAppAssigneesResponse> {
    return this.listAssignees.execute({ actor: await this.actors.resolve(request) });
  }
}
