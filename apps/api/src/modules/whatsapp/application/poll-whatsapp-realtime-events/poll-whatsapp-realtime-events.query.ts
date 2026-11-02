import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface PollWhatsAppRealtimeEventsQuery {
  readonly actor: WhatsAppActor;
  readonly after: string | undefined;
  readonly waitMs: number;
  readonly signal: AbortSignal;
}
