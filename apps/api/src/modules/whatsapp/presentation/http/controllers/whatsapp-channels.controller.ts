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
import {
  CrmContext,
  CrmOrganizationGuard,
  type CrmRequestContext,
} from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { CreateWhatsAppChannelHandler } from '../../../application/create-whatsapp-channel/create-whatsapp-channel.handler.js';
import { DeleteWhatsAppChannelHandler } from '../../../application/delete-whatsapp-channel/delete-whatsapp-channel.handler.js';
import { DisconnectWhatsAppChannelHandler } from '../../../application/disconnect-whatsapp-channel/disconnect-whatsapp-channel.handler.js';
import { GetWhatsAppChannelHandler } from '../../../application/get-whatsapp-channel/get-whatsapp-channel.handler.js';
import { GetWhatsAppSetupHandler } from '../../../application/get-whatsapp-setup/get-whatsapp-setup.handler.js';
import { ListWhatsAppChannelsHandler } from '../../../application/list-whatsapp-channels/list-whatsapp-channels.handler.js';
import { RotateWhatsAppChannelCredentialsHandler } from '../../../application/rotate-whatsapp-channel-credentials/rotate-whatsapp-channel-credentials.handler.js';
import { SyncWhatsAppChannelTemplatesHandler } from '../../../application/sync-whatsapp-channel-templates/sync-whatsapp-channel-templates.handler.js';
import { TestWhatsAppChannelHandler } from '../../../application/test-whatsapp-channel/test-whatsapp-channel.handler.js';
import { UpdateWhatsAppChannelHandler } from '../../../application/update-whatsapp-channel/update-whatsapp-channel.handler.js';
import { WhatsAppEmbeddedSignupChannelHandler } from '../../../application/whatsapp-embedded-signup-channel/whatsapp-embedded-signup-channel.handler.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppChannelsController {
  constructor(
    @Inject(GetWhatsAppSetupHandler) private readonly setup: GetWhatsAppSetupHandler,
    @Inject(ListWhatsAppChannelsHandler) private readonly listChannels: ListWhatsAppChannelsHandler,
    @Inject(CreateWhatsAppChannelHandler) private readonly createChannel: CreateWhatsAppChannelHandler,
    @Inject(WhatsAppEmbeddedSignupChannelHandler)
    private readonly embeddedSignupChannel: WhatsAppEmbeddedSignupChannelHandler,
    @Inject(GetWhatsAppChannelHandler) private readonly getChannel: GetWhatsAppChannelHandler,
    @Inject(UpdateWhatsAppChannelHandler) private readonly updateChannel: UpdateWhatsAppChannelHandler,
    @Inject(TestWhatsAppChannelHandler) private readonly testChannel: TestWhatsAppChannelHandler,
    @Inject(RotateWhatsAppChannelCredentialsHandler)
    private readonly rotateCredentials: RotateWhatsAppChannelCredentialsHandler,
    @Inject(DisconnectWhatsAppChannelHandler)
    private readonly disconnectChannel: DisconnectWhatsAppChannelHandler,
    @Inject(SyncWhatsAppChannelTemplatesHandler)
    private readonly syncTemplates: SyncWhatsAppChannelTemplatesHandler,
    @Inject(DeleteWhatsAppChannelHandler) private readonly deleteChannel: DeleteWhatsAppChannelHandler,
  ) {}

  @Get('setup')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Server-side WhatsApp setup status (no secrets)' })
  setupInfo(): WhatsAppSetupInfo {
    return this.setup.execute({});
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
    return this.listChannels.execute({ organizationId: ctx.organizationId });
  }

  @Post('channels')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Connect a channel with Cloud API credentials' })
  create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelTestResult> {
    return this.createChannel.execute({
      ctx,
      input: whatsappCreateChannelRequestSchema.parse(raw),
    });
  }

  @Post('channels/embedded-signup')
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Complete Meta Embedded Signup' })
  embeddedSignup(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelTestResult> {
    return this.embeddedSignupChannel.execute({
      ctx,
      input: whatsappEmbeddedSignupRequestSchema.parse(raw),
    });
  }

  @Get('channels/:id')
  @RequirePermissions('whatsapp.channels.manage')
  get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelSummary> {
    return this.getChannel.execute({ organizationId: ctx.organizationId, channelId: id });
  }

  @Patch('channels/:id')
  @RequirePermissions('whatsapp.channels.manage')
  rename(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() raw: unknown,
  ): Promise<WhatsAppChannelSummary> {
    return this.updateChannel.execute({
      ctx,
      channelId: id,
      name: whatsappUpdateChannelRequestSchema.parse(raw).name,
    });
  }

  @Post('channels/:id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Verify credentials with the Graph API and subscribe the app' })
  test(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelTestResult> {
    return this.testChannel.execute({ ctx, channelId: id });
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
    return this.rotateCredentials.execute({
      ctx,
      channelId: id,
      input: whatsappRotateCredentialsRequestSchema.parse(raw),
    });
  }

  @Post('channels/:id/disconnect')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Disconnect a channel and revoke its stored access token' })
  disconnect(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppChannelSummary> {
    return this.disconnectChannel.execute({ ctx, channelId: id });
  }

  @Post('channels/:id/sync-templates')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('whatsapp.channels.manage', 'whatsapp.templates.manage')
  @ApiOperation({ summary: 'Sync message templates from Meta' })
  syncChannelTemplates(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WhatsAppTemplateSyncResponse> {
    return this.syncTemplates.execute({ ctx, channelId: id });
  }

  @Delete('channels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('whatsapp.channels.manage')
  @ApiOperation({ summary: 'Delete a channel (history is kept, credentials are wiped)' })
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteChannel.execute({ ctx, channelId: id });
  }
}
