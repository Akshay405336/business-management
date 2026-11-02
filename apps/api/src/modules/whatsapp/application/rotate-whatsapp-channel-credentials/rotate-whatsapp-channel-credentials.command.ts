import type { WhatsAppRotateCredentialsRequest } from "@techwin/validation";
import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface RotateWhatsAppChannelCredentialsCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
  readonly input: WhatsAppRotateCredentialsRequest;
}
