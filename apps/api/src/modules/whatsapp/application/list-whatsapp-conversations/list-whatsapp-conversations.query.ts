import type { WhatsAppConversationListQuery } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface ListWhatsAppConversationsQuery {
  readonly actor: WhatsAppActor;
  readonly query: WhatsAppConversationListQuery;
}
