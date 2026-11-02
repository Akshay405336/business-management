import type { WhatsAppEmbeddedSignupRequest } from "@techwin/validation";
import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface WhatsAppEmbeddedSignupChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly input: WhatsAppEmbeddedSignupRequest;
}
