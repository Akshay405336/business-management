import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import type { PasswordHasher } from '../security.contracts.js';

/**
 * Argon2id parameters: 64 MiB memory, 3 iterations, single lane. This exceeds
 * the OWASP minimum (19 MiB, t=2, p=1) while keeping login latency reasonable.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  private dummyHash: Promise<string> | null = null;

  hash(plaintext: string): Promise<string> {
    return argon2.hash(plaintext, ARGON2_OPTIONS);
  }

  async verify(hash: string, plaintext: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  }

  async verifyAgainstDummy(plaintext: string): Promise<false> {
    this.dummyHash ??= this.hash(randomBytes(32).toString('base64url'));
    await this.verify(await this.dummyHash, plaintext);
    return false;
  }
}
