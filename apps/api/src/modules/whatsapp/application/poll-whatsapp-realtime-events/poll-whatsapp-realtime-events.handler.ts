import { Inject, Injectable } from '@nestjs/common';
import { WhatsAppRealtimeService } from '../services/whatsapp-realtime.service.js';
import type { PollWhatsAppRealtimeEventsQuery } from './poll-whatsapp-realtime-events.query.js';

@Injectable()
export class PollWhatsAppRealtimeEventsHandler {
  constructor(@Inject(WhatsAppRealtimeService) private readonly realtime: WhatsAppRealtimeService) {}

  async execute(query: PollWhatsAppRealtimeEventsQuery) {
    return this.realtime.poll(query.actor, query.after, query.waitMs, query.signal);
  }
}
