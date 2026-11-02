export const MEDIA_CLEANUP_LOCK = Symbol('MEDIA_CLEANUP_LOCK');

export interface MediaCleanupLockPort {
  runExclusive(lockKey: string, ttlMs: number, task: () => Promise<void>): Promise<boolean>;
}
