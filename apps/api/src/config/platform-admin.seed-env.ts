import { platformEmailSchema, platformNewPasswordSchema } from '@techwin/validation';
import { z } from 'zod';

/**
 * Server-only Super Admin seed configuration. These variables are never read by
 * the HTTP API or the web app; missing or invalid values fail the seed command
 * without echoing secrets.
 */
export const platformAdminSeedEnvSchema = z.object({
  PLATFORM_ADMIN_EMAIL: platformEmailSchema,
  PLATFORM_ADMIN_PASSWORD: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    platformNewPasswordSchema,
  ),
  PLATFORM_ADMIN_NAME: z
    .string({ error: 'PLATFORM_ADMIN_NAME is required.' })
    .trim()
    .min(1, 'PLATFORM_ADMIN_NAME is required.')
    .max(120, 'PLATFORM_ADMIN_NAME is too long.')
    .default('Super Admin'),
});

export type PlatformAdminSeedEnv = z.infer<typeof platformAdminSeedEnvSchema>;

export class InvalidPlatformAdminSeedEnvError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid Super Admin seed configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'InvalidPlatformAdminSeedEnvError';
  }
}

function issueLabel(path: readonly PropertyKey[]): string {
  return path.map(String).join('.') || '(root)';
}

/** Validates seed variables. Messages name the variable, never its value. */
export function loadPlatformAdminSeedEnv(
  source: NodeJS.ProcessEnv = process.env,
): PlatformAdminSeedEnv {
  const parsed = platformAdminSeedEnvSchema.safeParse({
    PLATFORM_ADMIN_EMAIL: source.PLATFORM_ADMIN_EMAIL,
    PLATFORM_ADMIN_PASSWORD: source.PLATFORM_ADMIN_PASSWORD,
    PLATFORM_ADMIN_NAME: source.PLATFORM_ADMIN_NAME,
  });
  if (parsed.success) return parsed.data;
  throw new InvalidPlatformAdminSeedEnvError(
    parsed.error.issues.map((issue) => `${issueLabel(issue.path)}: ${issue.message}`),
  );
}
