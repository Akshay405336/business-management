/**
 * Technical contracts and injection tokens for shared security capabilities.
 * Application use cases depend on these interfaces; implementations live in the
 * sibling folders and are bound by their Nest modules. This file must stay free
 * of runtime dependencies.
 */

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const ACCESS_TOKEN_SIGNER = Symbol('ACCESS_TOKEN_SIGNER');
export const ACCESS_TOKEN_VERIFIER = Symbol('ACCESS_TOKEN_VERIFIER');
export const TOTP_CODE_VERIFIER = Symbol('TOTP_CODE_VERIFIER');
export const TOTP_SECRET_GENERATOR = Symbol('TOTP_SECRET_GENERATOR');
export const OPAQUE_TOKEN_SERVICE = Symbol('OPAQUE_TOKEN_SERVICE');
export const RATE_LIMITER = Symbol('RATE_LIMITER');

export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  verify(hash: string, plaintext: string): Promise<boolean>;
  needsRehash(hash: string): boolean;
  /** Burns comparable CPU time when no account exists, to resist user enumeration. */
  verifyAgainstDummy(plaintext: string): Promise<false>;
}

export interface AccessTokenClaims {
  readonly subject: string;
  readonly sessionId: string;
  readonly role: string;
}

export interface AccessTokenSigner {
  sign(claims: AccessTokenClaims, expiresAt: Date): Promise<string>;
}

export interface AccessTokenVerifier {
  /** Returns `null` for any malformed, forged, or expired token. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}

export type TotpVerification =
  { readonly valid: true; readonly timeStep: number } | { readonly valid: false };

export interface TotpCodeVerifier {
  verify(input: {
    readonly secret: string;
    readonly code: string;
    /** Codes at or before this time step are rejected (replay protection). */
    readonly afterTimeStep: number | null;
  }): Promise<TotpVerification>;
}

export interface TotpSecretGenerator {
  generateSecret(): string;
  buildEnrollmentUri(input: { readonly secret: string; readonly accountName: string }): string;
}

export interface OpaqueTokenService {
  /** 256-bit random token, base64url encoded. */
  generate(): string;
  /** Deterministic SHA-256 digest (hex) used for storage and lookup. */
  hash(token: string): string;
  /** Constant-time comparison of a token against a stored digest. */
  matches(token: string, expectedHash: string): boolean;
}

export interface RateLimitPolicy {
  readonly name: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(policy: RateLimitPolicy, key: string): Promise<RateLimitDecision>;
  reset(policy: RateLimitPolicy, key: string): Promise<void>;
}
