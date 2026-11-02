import { Controller, Get, Inject, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { WhatsAppRealtimeResponse } from '@techwin/contracts';
import { whatsappRealtimeQuerySchema } from '@techwin/validation';
import type { Request, Response } from 'express';
import { PlatformAdminGuard } from '../../../../auth/index.js';
import { CrmOrganizationGuard } from '../../../../../platform/tenant-context/index.js';
import { RequirePermissions, RequirePermissionsGuard } from '../../../../org-access/index.js';
import { PollWhatsAppRealtimeEventsHandler } from '../../../application/poll-whatsapp-realtime-events/poll-whatsapp-realtime-events.handler.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';
import { WhatsAppActorResolver } from '../whatsapp-actor.resolver.js';

@ApiTags('WhatsApp Inbox')
@ApiBearerAuth()
@Controller('whatsapp/realtime')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppRealtimeController {
  constructor(
    @Inject(PollWhatsAppRealtimeEventsHandler)
    private readonly pollEvents: PollWhatsAppRealtimeEventsHandler,
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
      return await this.pollEvents.execute({
        actor,
        after: query.after,
        waitMs: query.waitMs,
        signal: abort.signal,
      });
    } finally {
      response.off('close', onClose);
    }
  }
}
