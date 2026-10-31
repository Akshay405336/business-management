import type {
  RateLimitPolicy,
  RateLimiter,
} from '../../../infrastructure/security/security.contracts.js';
import { WhatsAppForbiddenError, WhatsAppRateLimitedError } from '../domain/whatsapp.errors.js';
import type { ConversationAccessRecord, InboxScope } from './whatsapp.stores.js';

/** Signed-in staff member resolved from the trusted session and organization membership. */
export interface WhatsAppActor {
  readonly organizationId: string;
  readonly adminId: string;
  /** Employee profile linked to the admin, if any; required to own conversations. */
  readonly employeeId: string | null;
  readonly canViewAll: boolean;
  readonly canReply: boolean;
  readonly canAssign: boolean;
}

export function inboxScope(actor: WhatsAppActor): InboxScope {
  return { canViewAll: actor.canViewAll, employeeId: actor.employeeId };
}

/** Agents without `whatsapp.view_all` see their own and unassigned conversations only. */
export function canSeeConversation(
  actor: WhatsAppActor,
  record: ConversationAccessRecord,
): boolean {
  if (actor.canViewAll) return true;
  return record.assignedEmployeeId === null || record.assignedEmployeeId === actor.employeeId;
}

export function assertCanSeeConversation(
  actor: WhatsAppActor,
  record: ConversationAccessRecord,
): void {
  if (!canSeeConversation(actor, record)) throw new WhatsAppForbiddenError();
}

export const WHATSAPP_RATE_LIMITS = {
  send: { name: 'whatsapp:send', limit: 60, windowSeconds: 60 },
  channelAdmin: { name: 'whatsapp:channel-admin', limit: 20, windowSeconds: 300 },
  templateSubmit: { name: 'whatsapp:template-submit', limit: 10, windowSeconds: 3600 },
  broadcastCreate: { name: 'whatsapp:broadcast-create', limit: 10, windowSeconds: 3600 },
  webhook: { name: 'whatsapp:webhook', limit: 1200, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitPolicy>;

/** Abuse throttling only; like the global limiter it fails open when Redis is unavailable. */
export async function enforceRateLimit(
  limiter: RateLimiter,
  policy: RateLimitPolicy,
  key: string,
): Promise<void> {
  let allowed = true;
  let retryAfterSeconds = 1;
  try {
    const decision = await limiter.consume(policy, key);
    allowed = decision.allowed;
    retryAfterSeconds = decision.retryAfterSeconds;
  } catch {
    return;
  }
  if (!allowed) throw new WhatsAppRateLimitedError(Math.max(1, retryAfterSeconds));
}
