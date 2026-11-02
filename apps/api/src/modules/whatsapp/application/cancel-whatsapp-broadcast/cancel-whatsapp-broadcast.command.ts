import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface CancelWhatsAppBroadcastCommand {
  readonly ctx: CrmRequestContext;
  readonly broadcastId: string;
}
