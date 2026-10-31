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
import { WhatsAppWebhookService } from '../../../application/whatsapp-webhook.service.js';
import { WhatsAppExceptionFilter } from '../filters/whatsapp-exception.filter.js';

/**
 * Public Meta webhook endpoint. Authenticity comes from the per-channel secret URL
 * key, the verify token handshake and the X-Hub-Signature-256 HMAC over the raw body.
 */
@ApiExcludeController()
@Controller('webhooks/whatsapp')
@UseFilters(WhatsAppExceptionFilter)
export class WhatsAppWebhookController {
  constructor(@Inject(WhatsAppWebhookService) private readonly webhooks: WhatsAppWebhookService) {}

  @Get(':channelKey')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  verify(@Param('channelKey') channelKey: string, @Req() request: Request): Promise<string> {
    return this.webhooks.verifySubscription(channelKey, {
      mode: request.query['hub.mode'],
      token: request.query['hub.verify_token'],
      challenge: request.query['hub.challenge'],
    });
  }

  @Post(':channelKey')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('channelKey') channelKey: string,
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<{ received: true }> {
    await this.webhooks.receive(channelKey, request.rawBody, request.get('x-hub-signature-256'));
    return { received: true };
  }
}
