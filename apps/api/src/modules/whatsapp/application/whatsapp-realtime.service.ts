import { EventEmitter } from 'node:events';
import { Inject, Injectable } from '@nestjs/common';
import type { WhatsAppRealtimeResponse } from '@techwin/contracts';
import { inboxScope, type WhatsAppActor } from './whatsapp-access.js';
import { WHATSAPP_INBOX_STORE, type WhatsAppInboxStore } from './whatsapp.stores.js';

const DB_POLL_MS = 1_500;
const MAX_BACKLOG = 500;
const BATCH = 200;

/**
 * Realtime delivery over authenticated long-polling. Events are persisted
 * first (per-organization cursor) and filtered by the caller's inbox scope, so
 * reconnecting clients catch up from their last cursor. The in-process emitter
 * only shortens latency; the periodic database check covers other API instances.
 */
@Injectable()
export class WhatsAppRealtimeService {
  private readonly emitter = new EventEmitter();

  constructor(@Inject(WHATSAPP_INBOX_STORE) private readonly inbox: WhatsAppInboxStore) {
    this.emitter.setMaxListeners(0);
  }

  notify(organizationId: string): void {
    this.emitter.emit(organizationId);
  }

  async poll(
    actor: WhatsAppActor,
    after: string | undefined,
    waitMs: number,
    signal: AbortSignal,
  ): Promise<WhatsAppRealtimeResponse> {
    const latest = await this.inbox.latestEventCursor(actor.organizationId);
    if (after === undefined) return { events: [], cursor: latest.toString(), resync: false };

    let cursor = BigInt(after);
    if (cursor > latest) cursor = latest;
    if (latest - cursor > BigInt(MAX_BACKLOG)) {
      return { events: [], cursor: latest.toString(), resync: true };
    }

    const deadline = Date.now() + waitMs;
    const scope = inboxScope(actor);
    for (;;) {
      const batch = await this.inbox.eventsAfter(actor.organizationId, scope, cursor, BATCH);
      if (batch.lastScanned > cursor) cursor = batch.lastScanned;
      if (batch.events.length > 0 || signal.aborted) {
        return { events: batch.events, cursor: cursor.toString(), resync: false };
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) return { events: [], cursor: cursor.toString(), resync: false };
      await this.waitForWake(actor.organizationId, Math.min(remaining, DB_POLL_MS), signal);
    }
  }

  private waitForWake(organizationId: string, ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.emitter.off(organizationId, done);
        signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.emitter.on(organizationId, done);
      signal.addEventListener('abort', done, { once: true });
    });
  }
}
