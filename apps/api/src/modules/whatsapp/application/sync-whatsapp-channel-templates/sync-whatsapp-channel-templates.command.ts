import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface SyncWhatsAppChannelTemplatesCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
}
