import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface TestWhatsAppChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly channelId: string;
}
