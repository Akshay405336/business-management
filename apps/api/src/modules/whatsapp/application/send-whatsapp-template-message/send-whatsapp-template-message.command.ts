import type { WhatsAppSendTemplateRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SendWhatsAppTemplateMessageCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly input: WhatsAppSendTemplateRequest;
}
