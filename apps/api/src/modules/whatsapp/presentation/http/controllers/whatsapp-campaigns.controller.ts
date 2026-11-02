import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  WhatsAppAnalyticsResponse,
  WhatsAppBroadcastAudiencePreview,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastListResponse,
  WhatsAppTemplateListResponse,
  WhatsAppTemplateSummary,
} from '@techwin/contracts';
import {
  whatsappAnalyticsQuerySchema,
  whatsappBroadcastAudiencePreviewRequestSchema,
  whatsappCreateBroadcastRequestSchema,
  whatsappCreateTemplateRequestSchema,
  whatsappTemplateListQuerySchema,
} from '@techwin/validation';
import type { Request } from 'express';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { CancelWhatsAppBroadcastHandler } from '../../../application/cancel-whatsapp-broadcast/cancel-whatsapp-broadcast.handler.js';
import { CreateWhatsAppBroadcastHandler } from '../../../application/create-whatsapp-broadcast/create-whatsapp-broadcast.handler.js';
import { CreateWhatsAppTemplateHandler } from '../../../application/create-whatsapp-template/create-whatsapp-template.handler.js';
import { GetWhatsAppAnalyticsHandler } from '../../../application/get-whatsapp-analytics/get-whatsapp-analytics.handler.js';
import { GetWhatsAppBroadcastHandler } from '../../../application/get-whatsapp-broadcast/get-whatsapp-broadcast.handler.js';
import { GetWhatsAppTemplateHandler } from '../../../application/get-whatsapp-template/get-whatsapp-template.handler.js';
import { ListWhatsAppBroadcastsHandler } from '../../../application/list-whatsapp-broadcasts/list-whatsapp-broadcasts.handler.js';
import { ListWhatsAppTemplatesHandler } from '../../../application/list-whatsapp-templates/list-whatsapp-templates.handler.js';
import { PreviewWhatsAppBroadcastAudienceHandler } from '../../../application/preview-whatsapp-broadcast-audience/preview-whatsapp-broadcast-audience.handler.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';

@ApiTags('WhatsApp Templates & Broadcasts')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppCampaignsController {
  constructor(
    @Inject(ListWhatsAppTemplatesHandler) private readonly listTemplates: ListWhatsAppTemplatesHandler,
    @Inject(GetWhatsAppTemplateHandler) private readonly getTemplate: GetWhatsAppTemplateHandler,
    @Inject(CreateWhatsAppTemplateHandler) private readonly createTemplate: CreateWhatsAppTemplateHandler,
    @Inject(ListWhatsAppBroadcastsHandler) private readonly listBroadcasts: ListWhatsAppBroadcastsHandler,
    @Inject(PreviewWhatsAppBroadcastAudienceHandler)
    private readonly previewBroadcastAudience: PreviewWhatsAppBroadcastAudienceHandler,
    @Inject(CreateWhatsAppBroadcastHandler) private readonly createBroadcast: CreateWhatsAppBroadcastHandler,
    @Inject(GetWhatsAppBroadcastHandler) private readonly getBroadcast: GetWhatsAppBroadcastHandler,
    @Inject(CancelWhatsAppBroadcastHandler) private readonly cancelBroadcast: CancelWhatsAppBroadcastHandler,
    @Inject(GetWhatsAppAnalyticsHandler) private readonly analytics: GetWhatsAppAnalyticsHandler,
  ) {}

  @Get('templates')
  @RequirePermissions('whatsapp.read', 'whatsapp.templates.manage', 'whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'List synced message templates' })
  listTemplatesRoute(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<WhatsAppTemplateListResponse> {
    return this.listTemplates.execute({
      organizationId: ctx.organizationId,
      query: whatsappTemplateListQuerySchema.parse(request.query),
    });
  }

  @Get('templates/:id')
  @RequirePermissions('whatsapp.read', 'whatsapp.templates.manage', 'whatsapp.broadcasts.manage')
  getTemplateRoute(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTemplateSummary> {
    return this.getTemplate.execute({ organizationId: ctx.organizationId, templateId: id });
  }

  @Post('templates')
  @RequirePermissions('whatsapp.templates.manage')
  @ApiOperation({ summary: 'Submit a text template to Meta for review' })
  submitTemplate(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppTemplateSummary> {
    return this.createTemplate.execute({
      ctx,
      input: whatsappCreateTemplateRequestSchema.parse(raw),
    });
  }

  @Get('broadcasts')
  @RequirePermissions('whatsapp.broadcasts.manage')
  listBroadcastsRoute(@CrmContext() ctx: CrmRequestContext): Promise<WhatsAppBroadcastListResponse> {
    return this.listBroadcasts.execute({ organizationId: ctx.organizationId });
  }

  @Post('broadcasts/audience-preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'Count opted-in recipients for an audience' })
  previewAudience(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppBroadcastAudiencePreview> {
    return this.previewBroadcastAudience.execute({
      organizationId: ctx.organizationId,
      input: whatsappBroadcastAudiencePreviewRequestSchema.parse(raw),
    });
  }

  @Post('broadcasts')
  @RequirePermissions('whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'Create a confirmed broadcast (sends now or at the scheduled time)' })
  createBroadcastRoute(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.createBroadcast.execute({
      ctx,
      input: whatsappCreateBroadcastRequestSchema.parse(raw),
    });
  }

  @Get('broadcasts/:id')
  @RequirePermissions('whatsapp.broadcasts.manage')
  getBroadcastRoute(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.getBroadcast.execute({ organizationId: ctx.organizationId, broadcastId: id });
  }

  @Post('broadcasts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.broadcasts.manage')
  cancelBroadcastRoute(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.cancelBroadcast.execute({ ctx, broadcastId: id });
  }

  @Get('analytics')
  @RequirePermissions('whatsapp.view_all', 'whatsapp.channels.manage')
  @ApiOperation({ summary: 'WhatsApp messaging and response analytics' })
  analyticsSummary(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<WhatsAppAnalyticsResponse> {
    return this.analytics.execute({
      organizationId: ctx.organizationId,
      query: whatsappAnalyticsQuerySchema.parse(request.query),
    });
  }
}
