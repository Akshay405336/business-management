import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import QRCode from 'qrcode';
import { AppConfigModule } from '../../../config/config.module.js';
import { loadEnvFile } from '../../../config/load-env-file.js';
import { loadPlatformAdminSeedEnv } from '../../../config/platform-admin.seed-env.js';
import { DatabaseModule } from '../../../infrastructure/database/database.module.js';
import { PasswordHashingModule } from '../../../infrastructure/security/password-hashing/password-hashing.module.js';
import { TotpModule } from '../../../infrastructure/security/totp/totp.module.js';
import { SynchronizeSuperAdminHandler } from '../application/synchronize-super-admin/synchronize-super-admin.handler.js';
import type { SynchronizeSuperAdminResult } from '../application/synchronize-super-admin/synchronize-super-admin.result.js';
import { platformAuthPersistenceProviders } from '../auth.module.js';

/** Minimal context: only what seeding needs (no HTTP server, no Redis). */
@Module({
  imports: [AppConfigModule, DatabaseModule, PasswordHashingModule, TotpModule],
  providers: [...platformAuthPersistenceProviders, SynchronizeSuperAdminHandler],
})
class SuperAdminSeedModule {}

export async function runSynchronizeSuperAdmin(): Promise<SynchronizeSuperAdminResult> {
  loadEnvFile();
  const env = loadPlatformAdminSeedEnv();
  const context = await NestFactory.createApplicationContext(SuperAdminSeedModule, {
    logger: ['error', 'warn'],
  });
  try {
    const handler = context.get(SynchronizeSuperAdminHandler);
    return await handler.execute({
      email: env.PLATFORM_ADMIN_EMAIL,
      displayName: env.PLATFORM_ADMIN_NAME,
      password: env.PLATFORM_ADMIN_PASSWORD,
    });
  } finally {
    await context.close();
  }
}

export async function printSynchronizeResult(result: SynchronizeSuperAdminResult): Promise<void> {
  const headline =
    result.outcome === 'created'
      ? `Created Super Admin ${result.email}.`
      : `Synchronized Super Admin ${result.email} to the current environment.`;
  console.log(headline);
  if (result.deactivatedAdmins > 0) {
    console.log(`  - Removed ${result.deactivatedAdmins} previous Super Admin account(s).`);
  }
  if (result.revokedSessions > 0) {
    console.log(`  - Revoked ${result.revokedSessions} session(s).`);
  }
  console.log('  - Password hash replaced. Previous password will no longer authenticate.');
  console.log('  - Outstanding authentication challenges were consumed.');
  console.log(
    '\nA new authenticator secret was generated. Previous TOTP enrollments are invalid — scan this QR code now:\n',
  );
  console.log(
    await QRCode.toString(result.enrollment.otpauthUri, { type: 'terminal', small: true }),
  );
  console.log('Or enter this setup key manually (time-based, 6 digits, 30 seconds):');
  console.log(`  ${result.enrollment.secret.replace(/(.{4})/g, '$1 ').trim()}\n`);
  console.log(
    'This secret is shown only once and is stored encrypted. Re-run `pnpm db:seed` whenever PLATFORM_ADMIN_* changes; enroll the new QR after every seed.',
  );
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runSynchronizeSuperAdmin()
    .then(printSynchronizeResult)
    .catch((error: unknown) => {
      console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
