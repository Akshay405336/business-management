/**
 * `prisma db seed` entry point. Synchronizes the sole Platform Super Admin to
 * PLATFORM_ADMIN_* in `.env`. Every run hashes the current password, issues a
 * new TOTP secret, and revokes previous sessions and challenges.
 */
import { loadEnvFile } from '../src/config/load-env-file.js';
import {
  printSynchronizeResult,
  runSynchronizeSuperAdmin,
} from '../src/modules/auth/cli/synchronize-super-admin.js';

async function seed(): Promise<void> {
  loadEnvFile();
  const result = await runSynchronizeSuperAdmin();
  await printSynchronizeResult(result);
}

seed().catch((error: unknown) => {
  console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
