import type { WhatsAppConsentRequest } from "@techwin/validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SetWhatsAppContactConsentCommand {
  readonly actor: WhatsAppActor;
  readonly contactId: string;
  readonly input: WhatsAppConsentRequest;
}
