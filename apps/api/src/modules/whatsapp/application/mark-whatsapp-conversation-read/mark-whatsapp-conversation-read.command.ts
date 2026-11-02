import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface MarkWhatsAppConversationReadCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
}
