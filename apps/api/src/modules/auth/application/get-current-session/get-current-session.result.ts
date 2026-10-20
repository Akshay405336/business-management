import type {
  PlatformAdmin,
  PlatformAdminRole,
} from '../../domain/entities/platform-admin.entity.js';
import type { PlatformSession } from '../../domain/entities/platform-session.entity.js';

/** Public view of an administrator: no credentials or secrets. */
export interface PlatformAdminView {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: PlatformAdminRole;
  readonly lastLoginAt: Date | null;
}

export interface PlatformSessionView {
  readonly id: string;
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
  readonly expiresAt: Date;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly current: boolean;
}

export interface GetCurrentSessionResult {
  readonly admin: PlatformAdminView;
  readonly session: PlatformSessionView;
}

export const toPlatformAdminView = (admin: PlatformAdmin): PlatformAdminView => ({
  id: admin.id,
  email: admin.email.value,
  displayName: admin.displayName,
  role: admin.role,
  lastLoginAt: admin.lastLoginAt,
});

export const toPlatformSessionView = (
  session: PlatformSession,
  currentSessionId: string,
): PlatformSessionView => ({
  id: session.id.value,
  createdAt: session.createdAt,
  lastActiveAt: session.lastActiveAt,
  expiresAt: session.expiresAt,
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  current: session.id.value === currentSessionId,
});
