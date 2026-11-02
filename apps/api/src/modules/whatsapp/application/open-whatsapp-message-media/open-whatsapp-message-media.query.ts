import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface OpenWhatsAppMessageMediaQuery {
  readonly actor: WhatsAppActor;
  readonly messageId: string;
}
