import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface RetryWhatsAppMessageCommand {
  readonly actor: WhatsAppActor;
  readonly messageId: string;
}
