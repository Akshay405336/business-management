import type { WhatsAppCreateTemplateRequest } from "@techwin/validation";
import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface CreateWhatsAppTemplateCommand {
  readonly ctx: CrmRequestContext;
  readonly input: WhatsAppCreateTemplateRequest;
}
