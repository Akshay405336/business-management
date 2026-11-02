import type { WhatsAppCreateBroadcastRequest } from "@techwin/validation";
import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface CreateWhatsAppBroadcastCommand {
  readonly ctx: CrmRequestContext;
  readonly input: WhatsAppCreateBroadcastRequest;
}
