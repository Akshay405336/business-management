import type { WhatsAppTimelineQuery } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface GetWhatsAppConversationTimelineQuery {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly query: WhatsAppTimelineQuery;
}
