/**
 * Lifetimes and limits that define how platform administrators authenticate.
 */
export const PLATFORM_SESSION_POLICY = {
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  challengeTtlSeconds: 5 * 60,
  maxTotpAttemptsPerChallenge: 5,
} as const;

const addSeconds = (from: Date, seconds: number): Date => new Date(from.getTime() + seconds * 1000);

export const PlatformSessionPolicy = {
  accessTokenExpiry: (now: Date): Date =>
    addSeconds(now, PLATFORM_SESSION_POLICY.accessTokenTtlSeconds),
  refreshTokenExpiry: (now: Date): Date =>
    addSeconds(now, PLATFORM_SESSION_POLICY.refreshTokenTtlSeconds),
  challengeExpiry: (now: Date): Date =>
    addSeconds(now, PLATFORM_SESSION_POLICY.challengeTtlSeconds),
  remainingTotpAttempts: (failedAttempts: number): number =>
    Math.max(0, PLATFORM_SESSION_POLICY.maxTotpAttemptsPerChallenge - failedAttempts),
} as const;
