import 'reflect-metadata';
import process, { stdin, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  platformEmailSchema,
  platformNewPasswordSchema,
  PLATFORM_PASSWORD_MIN_LENGTH,
} from '@techwin/validation';
import QRCode from 'qrcode';
import { AppConfigModule } from '../../../config/config.module.js';
import { loadEnvFile } from '../../../config/load-env-file.js';
import { DatabaseModule } from '../../../infrastructure/database/database.module.js';
import { PasswordHashingModule } from '../../../infrastructure/security/password-hashing/password-hashing.module.js';
import { TotpModule } from '../../../infrastructure/security/totp/totp.module.js';
import { BootstrapSuperAdminHandler } from '../application/bootstrap-super-admin/bootstrap-super-admin.handler.js';
import type { BootstrapSuperAdminResult } from '../application/bootstrap-super-admin/bootstrap-super-admin.result.js';
import { platformAuthPersistenceProviders } from '../auth.module.js';

/** Minimal context: only what provisioning needs (no HTTP server, no Redis). */
@Module({
  imports: [AppConfigModule, DatabaseModule, PasswordHashingModule, TotpModule],
  providers: [...platformAuthPersistenceProviders, BootstrapSuperAdminHandler],
})
class SuperAdminBootstrapModule {}

export interface BootstrapOptions {
  readonly email?: string | undefined;
  readonly displayName?: string | undefined;
  readonly resetPassword: boolean;
  readonly rotateTotp: boolean;
  /** Allow prompting for a password on an interactive terminal. */
  readonly interactive: boolean;
}

const USAGE = `Usage: pnpm admin:bootstrap [--email <email>] [--name <display name>] [--reset-password] [--rotate-totp]

Creates the first platform Super Admin, or does nothing if it already exists.
  --email           Defaults to PLATFORM_ADMIN_EMAIL.
  --name            Defaults to PLATFORM_ADMIN_NAME, then "Super Admin".
  --reset-password  Set a new password for an existing Super Admin.
  --rotate-totp     Issue a new authenticator secret (re-enrollment).
The password is read from PLATFORM_ADMIN_PASSWORD or prompted for interactively.
Prefer \`pnpm db:seed\` to synchronize the sole Super Admin to the current .env
(always hashes the password, always issues a new TOTP secret, and revokes sessions).
Resetting credentials signs the administrator out of every session.`;

export async function runBootstrapSuperAdmin(
  options: BootstrapOptions,
): Promise<BootstrapSuperAdminResult> {
  const email = platformEmailSchema.parse(options.email ?? process.env.PLATFORM_ADMIN_EMAIL ?? '');
  const displayName = (
    options.displayName ??
    process.env.PLATFORM_ADMIN_NAME ??
    'Super Admin'
  ).trim();

  const context = await NestFactory.createApplicationContext(SuperAdminBootstrapModule, {
    logger: ['error', 'warn'],
  });
  try {
    const handler = context.get(BootstrapSuperAdminHandler);
    const execute = (password: string | null) =>
      handler.execute({
        email,
        displayName,
        password,
        resetPassword: options.resetPassword,
        rotateTotp: options.rotateTotp,
      });

    const envPassword = process.env.PLATFORM_ADMIN_PASSWORD;
    const result = await execute(envPassword ? validatePassword(envPassword) : null);
    if (result.outcome !== 'password_required') return result;
    return await execute(await promptPassword(options.interactive));
  } finally {
    await context.close();
  }
}

async function promptPassword(interactive: boolean): Promise<string> {
  if (!interactive || !stdin.isTTY) {
    throw new Error(
      'A password is required. Set PLATFORM_ADMIN_PASSWORD or run `pnpm admin:bootstrap` in an interactive terminal.',
    );
  }
  console.log(
    `Choose a password (min. ${PLATFORM_PASSWORD_MIN_LENGTH} characters, upper/lower case, digit, symbol).`,
  );
  const password = await readHidden('Password: ');
  const confirmation = await readHidden('Confirm password: ');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  return validatePassword(password);
}

function validatePassword(password: string): string {
  const checked = platformNewPasswordSchema.safeParse(password);
  if (!checked.success) {
    throw new Error(
      `Password rejected: ${checked.error.issues.map((issue) => issue.message).join(' ')}`,
    );
  }
  return checked.data;
}

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else value += character;
      }
    };
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

export async function printBootstrapResult(result: BootstrapSuperAdminResult): Promise<void> {
  const headline = {
    created: `Created Super Admin ${result.email}.`,
    unchanged: `Super Admin ${result.email} already exists; nothing changed.`,
    updated: `Updated Super Admin ${result.email}.`,
    password_required: `A password is required to provision ${result.email}; nothing changed.`,
  }[result.outcome];
  console.log(headline);
  if (result.passwordReset) console.log('  - Password replaced.');
  if (result.revokedSessions > 0)
    console.log(`  - Revoked ${result.revokedSessions} active session(s).`);
  if (result.outcome === 'unchanged' && !result.totpEnrolled) {
    console.log(
      '  - Authenticator not confirmed yet. Use --rotate-totp to display a new enrollment code.',
    );
  }

  if (result.enrollment) {
    console.log(
      '\nScan this QR code with an authenticator app (Google Authenticator, 1Password, Authy, ...):\n',
    );
    console.log(
      await QRCode.toString(result.enrollment.otpauthUri, { type: 'terminal', small: true }),
    );
    console.log('Or enter this setup key manually (time-based, 6 digits, 30 seconds):');
    console.log(`  ${result.enrollment.secret.replace(/(.{4})/g, '$1 ').trim()}\n`);
    console.log(
      'This secret is shown only once and is stored encrypted. Enrollment is confirmed by your first sign-in.',
    );
  }
  if (process.env.PLATFORM_ADMIN_PASSWORD) {
    console.log(
      '\nPLATFORM_ADMIN_PASSWORD remains the source of truth for `pnpm db:seed`; it is never used by the HTTP API.',
    );
  }
}

async function main(): Promise<void> {
  loadEnvFile();
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      'reset-password': { type: 'boolean', default: false },
      'rotate-totp': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  const result = await runBootstrapSuperAdmin({
    email: values.email,
    displayName: values.name,
    resetPassword: values['reset-password'],
    rotateTotp: values['rotate-totp'],
    interactive: true,
  });
  await printBootstrapResult(result);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error: unknown) => {
    console.error(`Bootstrap failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
