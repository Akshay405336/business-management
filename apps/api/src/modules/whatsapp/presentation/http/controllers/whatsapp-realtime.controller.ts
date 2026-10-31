import { Controller, Get, Inject, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { WhatsAppRealtimeResponse } from '@techwin/contracts';
import { whatsappRealtimeQuerySchema } from '@techwin/validation';
import type { Request, Response } from 'express';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import { CrmOrganizationGuard } from '../../../../crm/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { WhatsAppRealtimeService } from '../../../application/whatsapp-realtime.service.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';
import { WhatsAppActorResolver } from '../whatsapp-actor.resolver.js';

@ApiTags('WhatsApp Inbox')
@ApiBearerAuth()
@Controller('whatsapp/realtime')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppRealtimeController {
  constructor(
    @Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService,
    @Inject(WhatsAppActorResolver) private readonly actors: WhatsAppActorResolver,
  ) {}

  /**
   * Long-poll for inbox events after `after`. Returns immediately when events are
   * pending, otherwise waits up to `waitMs`. Omit `after` to obtain the current cursor.
   */
  @Get('events')
  @RequirePermissions('whatsapp.read')
  @ApiOperation({ summary: 'Long-poll inbox events (tenant- and permission-scoped)' })
  async events(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WhatsAppRealtimeResponse> {
    const query = whatsappRealtimeQuerySchema.parse(request.query);
    const actor = await this.actors.resolve(request);
    const abort = new AbortController();
    const onClose = () => abort.abort();
    response.on('close', onClose);
    try {
      return await this.realtime.poll(actor, query.after, query.waitMs, abort.signal);
    } finally {
      response.off('close', onClose);
    }
  }
}
