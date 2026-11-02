import type { WhatsAppStartConversationRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface StartWhatsAppConversationCommand {
  readonly actor: WhatsAppActor;
  readonly input: WhatsAppStartConversationRequest;
}
