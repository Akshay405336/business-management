import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface DeleteWhatsAppChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
}
