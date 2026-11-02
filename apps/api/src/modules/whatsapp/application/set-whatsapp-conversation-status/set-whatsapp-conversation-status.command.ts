import type { WhatsAppConversationStatusRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SetWhatsAppConversationStatusCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly input: WhatsAppConversationStatusRequest;
}
