import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface UpdateWhatsAppChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
  readonly name: string;
}
