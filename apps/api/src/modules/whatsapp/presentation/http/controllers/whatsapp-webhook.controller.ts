import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  UseFilters,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { ReceiveWhatsAppWebhookHandler } from '../../../application/receive-whatsapp-webhook/receive-whatsapp-webhook.handler.js';
import { VerifyWhatsAppWebhookHandler } from '../../../application/verify-whatsapp-webhook/verify-whatsapp-webhook.handler.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';
import { metaWebhookVerifyParams } from '../../../application/shared/meta-webhook-verify-query.js';

/**
 * Public Meta webhook endpoint. Authenticity comes from the per-channel secret URL
 * key, the verify token handshake and the X-Hub-Signature-256 HMAC over the raw body.
 */
@ApiExcludeController()
@Controller('webhooks/whatsapp')
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppWebhookController {
  constructor(
    @Inject(VerifyWhatsAppWebhookHandler) private readonly verifyWebhook: VerifyWhatsAppWebhookHandler,
    @Inject(ReceiveWhatsAppWebhookHandler) private readonly receiveWebhook: ReceiveWhatsAppWebhookHandler,
  ) {}

  @Get(':channelKey')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verify(@Param('channelKey') channelKey: string, @Req() request: Request): Promise<string> {
    const { mode, token, challenge } = metaWebhookVerifyParams(request);
    return this.verifyWebhook.execute({
      channelKey,
      mode,
      token,
      challenge,
    });
  }

  @Post(':channelKey')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('channelKey') channelKey: string,
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<{ received: true }> {
    await this.receiveWebhook.execute({
      channelKey,
      rawBody: request.rawBody,
      signature: request.get('x-hub-signature-256'),
    });
    return { received: true };
  }
}
