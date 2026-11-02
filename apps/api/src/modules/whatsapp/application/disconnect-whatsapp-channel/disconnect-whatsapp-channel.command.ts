import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface DisconnectWhatsAppChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
}
