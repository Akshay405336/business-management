#!/usr/bin/env node
/**
 * Prints freshly generated secret values for a NEW environment. It never reads or
 * writes .env files: copy the values you need manually.
 *
 * Do not replace TOTP_ENCRYPTION_KEY in an environment that already has enrolled
 * administrators. Rotate it by moving the old key into
 * TOTP_ENCRYPTION_PREVIOUS_KEYS instead, otherwise existing secrets become unreadable.
 */
import { randomBytes } from 'node:crypto';

const values = {
  JWT_ACCESS_SECRET: randomBytes(48).toString('base64url'),
  TOTP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  POSTGRES_PASSWORD: randomBytes(24).toString('base64url'),
};

for (const [name, value] of Object.entries(values)) {
  console.log(`${name}=${value}`);
}
