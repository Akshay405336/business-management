import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface AddWhatsAppConversationNoteCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly body: string;
}
