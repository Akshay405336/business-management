import { AccountDisabledError } from '../errors/platform-auth.errors.js';
import type { PlatformEmail } from '../value-objects/platform-email.js';

export type PlatformAdminRole = 'SUPER_ADMIN';
export type PlatformAdminStatus = 'ACTIVE' | 'DISABLED';

export interface PlatformAdminProps {
  readonly id: string;
  readonly email: PlatformEmail;
  readonly displayName: string;
  readonly role: PlatformAdminRole;
  readonly status: PlatformAdminStatus;
  readonly passwordHash: string;
  readonly totpSecretCiphertext: string;
  readonly totpEnrolledAt: Date | null;
  readonly lastTotpTimeStep: number | null;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class PlatformAdmin {
  private constructor(private props: PlatformAdminProps) {}

  static rehydrate(props: PlatformAdminProps): PlatformAdmin {
    return new PlatformAdmin(props);
  }

  static registerSuperAdmin(input: {
    id: string;
    email: PlatformEmail;
    displayName: string;
    passwordHash: string;
    totpSecretCiphertext: string;
    now: Date;
  }): PlatformAdmin {
    return new PlatformAdmin({
      id: input.id,
      email: input.email,
      displayName: input.displayName.trim(),
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      passwordHash: input.passwordHash,
      totpSecretCiphertext: input.totpSecretCiphertext,
      totpEnrolledAt: null,
      lastTotpTimeStep: null,
      lastLoginAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): PlatformEmail {
    return this.props.email;
  }
  get displayName(): string {
    return this.props.displayName;
  }
  get role(): PlatformAdminRole {
    return this.props.role;
  }
  get status(): PlatformAdminStatus {
    return this.props.status;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get totpSecretCiphertext(): string {
    return this.props.totpSecretCiphertext;
  }
  get totpEnrolledAt(): Date | null {
    return this.props.totpEnrolledAt;
  }
  get lastTotpTimeStep(): number | null {
    return this.props.lastTotpTimeStep;
  }
  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  /** Enrollment is confirmed by the first successful TOTP verification. */
  get isTotpEnrolled(): boolean {
    return this.props.totpEnrolledAt !== null;
  }

  ensureCanAuthenticate(): void {
    if (!this.isActive) throw new AccountDisabledError();
  }

  changePasswordHash(passwordHash: string, now: Date): void {
    this.props = { ...this.props, passwordHash, updatedAt: now };
  }

  rename(displayName: string, now: Date): void {
    this.props = { ...this.props, displayName: displayName.trim(), updatedAt: now };
  }

  activate(now: Date): void {
    this.props = { ...this.props, status: 'ACTIVE', updatedAt: now };
  }

  disable(now: Date): void {
    this.props = { ...this.props, status: 'DISABLED', updatedAt: now };
  }

  /** A new secret invalidates the previous enrollment and replay window. */
  replaceTotpSecret(totpSecretCiphertext: string, now: Date): void {
    this.props = {
      ...this.props,
      totpSecretCiphertext,
      totpEnrolledAt: null,
      lastTotpTimeStep: null,
      updatedAt: now,
    };
  }
}
