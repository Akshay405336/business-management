import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface GetWhatsAppConversationQuery {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
}
