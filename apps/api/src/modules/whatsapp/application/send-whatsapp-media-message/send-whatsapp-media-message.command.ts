import type { WhatsAppSendMediaFields } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
import type { UploadedAttachment } from "../services/whatsapp-outbound.service.js";
export interface SendWhatsAppMediaMessageCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly file: UploadedAttachment | undefined;
  readonly fields: WhatsAppSendMediaFields;
}
