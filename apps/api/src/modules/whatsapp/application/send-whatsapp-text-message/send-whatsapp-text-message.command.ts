import type { WhatsAppSendTextRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SendWhatsAppTextMessageCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly input: WhatsAppSendTextRequest;
}
