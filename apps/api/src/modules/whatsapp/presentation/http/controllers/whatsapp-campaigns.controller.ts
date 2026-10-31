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
import { CrmContext, CrmOrganizationGuard, type CrmRequestContext } from '../../../../crm/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { WhatsAppAnalyticsService } from '../../../application/whatsapp-analytics.service.js';
import { WhatsAppBroadcastService } from '../../../application/whatsapp-broadcast.service.js';
import { WhatsAppTemplateService } from '../../../application/whatsapp-template.service.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';

@ApiTags('WhatsApp Templates & Broadcasts')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppCampaignsController {
  constructor(
    @Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService,
    @Inject(WhatsAppBroadcastService) private readonly broadcasts: WhatsAppBroadcastService,
    @Inject(WhatsAppAnalyticsService) private readonly analytics: WhatsAppAnalyticsService,
  ) {}

  @Get('templates')
  @RequirePermissions('whatsapp.read', 'whatsapp.templates.manage', 'whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'List synced message templates' })
  listTemplates(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<WhatsAppTemplateListResponse> {
    return this.templates.list(
      ctx.organizationId,
      whatsappTemplateListQuerySchema.parse(request.query),
    );
  }

  @Get('templates/:id')
  @RequirePermissions('whatsapp.read', 'whatsapp.templates.manage', 'whatsapp.broadcasts.manage')
  getTemplate(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTemplateSummary> {
    return this.templates.get(ctx.organizationId, id);
  }

  @Post('templates')
  @RequirePermissions('whatsapp.templates.manage')
  @ApiOperation({ summary: 'Submit a text template to Meta for review' })
  submitTemplate(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppTemplateSummary> {
    return this.templates.submit(ctx, whatsappCreateTemplateRequestSchema.parse(raw));
  }

  @Get('broadcasts')
  @RequirePermissions('whatsapp.broadcasts.manage')
  listBroadcasts(@CrmContext() ctx: CrmRequestContext): Promise<WhatsAppBroadcastListResponse> {
    return this.broadcasts.list(ctx.organizationId);
  }

  @Post('broadcasts/audience-preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'Count opted-in recipients for an audience' })
  previewAudience(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppBroadcastAudiencePreview> {
    return this.broadcasts.previewAudience(
      ctx.organizationId,
      whatsappBroadcastAudiencePreviewRequestSchema.parse(raw),
    );
  }

  @Post('broadcasts')
  @RequirePermissions('whatsapp.broadcasts.manage')
  @ApiOperation({ summary: 'Create a confirmed broadcast (sends now or at the scheduled time)' })
  createBroadcast(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.broadcasts.create(ctx, whatsappCreateBroadcastRequestSchema.parse(raw));
  }

  @Get('broadcasts/:id')
  @RequirePermissions('whatsapp.broadcasts.manage')
  getBroadcast(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.broadcasts.get(ctx.organizationId, id);
  }

  @Post('broadcasts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.broadcasts.manage')
  cancelBroadcast(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppBroadcastDetail> {
    return this.broadcasts.cancel(ctx, id);
  }

  @Get('analytics')
  @RequirePermissions('whatsapp.view_all', 'whatsapp.channels.manage')
  @ApiOperation({ summary: 'WhatsApp messaging and response analytics' })
  analyticsSummary(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: Request,
  ): Promise<WhatsAppAnalyticsResponse> {
    return this.analytics.summary(
      ctx.organizationId,
      whatsappAnalyticsQuerySchema.parse(request.query),
    );
  }
}
