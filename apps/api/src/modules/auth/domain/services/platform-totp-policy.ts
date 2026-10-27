import type { PlatformAdmin } from '../entities/platform-admin.entity.js';

/**
 * Central authentication policy: TOTP is required only for the protected
 * platform-level Super Admin account (`PlatformAdmin.role === 'SUPER_ADMIN'`).
 *
 * Organization roles (Owner, Admin, Project Manager, etc.) are always
 * `ORGANIZATION_MEMBER` at the platform layer and must never be inferred from
 * client input, JWT display claims, or organization role names.
 */
export function requiresTotpForLogin(admin: PlatformAdmin): boolean {
  return admin.role === 'SUPER_ADMIN';
}

/** @deprecated Prefer {@link requiresTotpForLogin} — kept for call-site clarity. */
export const requiresSuperAdminTotp = requiresTotpForLogin;
