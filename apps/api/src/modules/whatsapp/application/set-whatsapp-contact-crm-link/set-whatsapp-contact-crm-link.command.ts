import type { WhatsAppCrmLinkRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SetWhatsAppContactCrmLinkCommand {
  readonly actor: WhatsAppActor;
  readonly contactId: string;
  readonly input: WhatsAppCrmLinkRequest;
}
