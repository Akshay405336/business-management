import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  WhatsAppChannelListResponse,
  WhatsAppChannelSummary,
  WhatsAppChannelTestResult,
  WhatsAppSetupInfo,
  WhatsAppTemplateSyncResponse,
} from '@techwin/contracts';
import {
  whatsappCreateChannelRequestSchema,
  whatsappEmbeddedSignupRequestSchema,
  whatsappRotateCredentialsRequestSchema,
  whatsappUpdateChannelRequestSchema,
} from '@techwin/validation';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import { CrmContext, CrmOrganizationGuard, type CrmRequestContext } from '../../../../crm/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { WhatsAppChannelService } from '../../../application/whatsapp-channel.service.js';
import { WhatsAppTemplateService } from '../../../application/whatsapp-template.service.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppChannelsController {
  constructor(
    @Inject(WhatsAppChannelService) private readonly channels: WhatsAppChannelService,
    @Inject(WhatsAppTemplateService) private readonly templates: WhatsAppTemplateService,
  ) {}

  @Get('setup')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Server-side WhatsApp setup status (no secrets)' })
  setup(): WhatsAppSetupInfo {
    return this.channels.setupInfo();
  }

  @Get('channels')
  @RequirePermissions(
    'whatsapp.read',
    'whatsapp.view_all',
    'whatsapp.channels.manage',
    'whatsapp.templates.manage',
    'whatsapp.broadcasts.manage',
  )
  @ApiOperation({ summary: 'List WhatsApp channels (credentials are never returned)' })
  list(@CrmContext() ctx: CrmRequestContext): Promise<WhatsAppChannelListResponse> {
    return this.channels.list(ctx.organizationId);
  }

  @Post('channels')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Connect a channel with Cloud API credentials' })
  create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelTestResult> {
    return this.channels.create(ctx, whatsappCreateChannelRequestSchema.parse(raw));
  }

  @Post('channels/embedded-signup')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Complete Meta Embedded Signup' })
  embeddedSignup(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelTestResult> {
    return this.channels.embeddedSignup(ctx, whatsappEmbeddedSignupRequestSchema.parse(raw));
  }

  @Get('channels/:id')
  @RequirePermissions('whatsapp.channels.manage')
  get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelSummary> {
    return this.channels.get(ctx.organizationId, id);
  }

  @Patch('channels/:id')
  @RequirePermissions('whatsapp.channels.manage')
  rename(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelSummary> {
    return this.channels.rename(ctx, id, whatsappUpdateChannelRequestSchema.parse(raw).name);
  }

  @Post('channels/:id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Verify credentials with the Graph API and subscribe the app' })
  test(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelTestResult> {
    return this.channels.test(ctx, id);
  }

  @Post('channels/:id/credentials')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Rotate channel credentials' })
  rotate(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelTestResult> {
    return this.channels.rotateCredentials(
      ctx,
      id,
      whatsappRotateCredentialsRequestSchema.parse(raw),
    );
  }

  @Post('channels/:id/disconnect')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Disconnect a channel and revoke its stored access token' })
  disconnect(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelSummary> {
    return this.channels.disconnect(ctx, id);
  }

  @Post('channels/:id/sync-templates')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage', 'whatsapp.templates.manage')
  @ApiOperation({ summary: 'Sync message templates from Meta' })
  syncTemplates(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTemplateSyncResponse> {
    return this.templates.sync(ctx, id);
  }

  @Delete('channels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Delete a channel (history is kept, credentials are wiped)' })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.channels.remove(ctx, id);
  }
}
