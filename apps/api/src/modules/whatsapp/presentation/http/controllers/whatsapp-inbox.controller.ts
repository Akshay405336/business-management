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
import { CrmOrganizationGuard } from '../../../../crm/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { WhatsAppInboxService } from '../../../application/whatsapp-inbox.service.js';
import {
  WhatsAppOutboundService,
  type UploadedAttachment,
} from '../../../application/whatsapp-outbound.service.js';
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
    @Inject(WhatsAppInboxService) private readonly inbox: WhatsAppInboxService,
    @Inject(WhatsAppOutboundService) private readonly outbound: WhatsAppOutboundService,
    @Inject(WhatsAppActorResolver) private readonly actors: WhatsAppActorResolver,
  ) {}

  @Get('conversations')
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'List conversations visible to the caller' })
  async list(@Req() request: Request): Promise<WhatsAppConversationListResponse> {
    const actor = await this.actors.resolve(request);
    return this.inbox.list(actor, whatsappConversationListQuerySchema.parse(request.query));
  }

  @Get('conversations/counts')
  @RequirePermissions('whatsapp.read')
  async counts(@Req() request: Request): Promise<WhatsAppFolderCounts> {
    return this.inbox.counts(await this.actors.resolve(request));
  }

  @Post('conversations')
  @RequirePermissions('whatsapp.reply')
  @ApiOperation({ summary: 'Start a conversation with a phone number' })
  async start(@Req() request: Request, @Body() raw: unknown): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.inbox.startConversation(actor, whatsappStartConversationRequestSchema.parse(raw));
  }

  @Get('conversations/:id')
  @RequirePermissions('whatsapp.read')
  async detail(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppConversationDetail> {
    return this.inbox.detail(await this.actors.resolve(request), id);
  }

  @Get('conversations/:id/timeline')
  @RequirePermissions('whatsapp.read')
  async timeline(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTimelineResponse> {
    const actor = await this.actors.resolve(request);
    return this.inbox.timeline(actor, id, whatsappTimelineQuerySchema.parse(request.query));
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
    return this.outbound.sendText(actor, id, whatsappSendTextRequestSchema.parse(raw));
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
    return this.outbound.sendMedia(actor, id, file, whatsappSendMediaFieldsSchema.parse(raw));
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
    return this.outbound.sendTemplate(actor, id, whatsappSendTemplateRequestSchema.parse(raw));
  }

  @Post('conversations/:id/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'Add an internal note (never sent to WhatsApp)' })
  async addNote(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<void> {
    const actor = await this.actors.resolve(request);
    await this.inbox.addNote(actor, id, whatsappAddNoteRequestSchema.parse(raw).body);
  }

  @Patch('conversations/:id/assignment')
  @RequirePermissions('whatsapp.assign', 'whatsapp.reply')
  async assign(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.inbox.assign(actor, id, whatsappAssignRequestSchema.parse(raw));
  }

  @Patch('conversations/:id/status')
  @RequirePermissions('whatsapp.reply', 'whatsapp.assign')
  async setStatus(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppConversationDetail> {
    const actor = await this.actors.resolve(request);
    return this.inbox.setStatus(actor, id, whatsappConversationStatusRequestSchema.parse(raw));
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.read')
  async markRead(@Req() request: Request, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.inbox.markRead(await this.actors.resolve(request), id);
  }

  @Get('messages/:id/media')
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'Download message media after an access check' })
  async media(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const opened = await this.inbox.openMedia(await this.actors.resolve(request), id);
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
    return this.outbound.retry(await this.actors.resolve(request), id);
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
    await this.inbox.setConsent(actor, id, whatsappConsentRequestSchema.parse(raw));
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
    await this.inbox.setCrmLink(actor, id, whatsappCrmLinkRequestSchema.parse(raw));
  }

  @Get('assignees')
  @RequirePermissions('whatsapp.read')
  async assignees(@Req() request: Request): Promise<WhatsAppAssigneesResponse> {
    return this.inbox.assignees(await this.actors.resolve(request));
  }
}
