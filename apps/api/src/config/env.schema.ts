import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const commaSeparated = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

const httpOrigin = z
  .url({ protocol: /^https?$/, error: 'must be an absolute http(s) origin' })
  .transform((value) => new URL(value).origin);

/** Optional setting where a blank value (`KEY=` in .env) means unset; non-blank values must pass `schema`. */
const optionalUnlessBlank = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );

/** A base64-encoded 256-bit key. */
const aes256Key = z.string().refine((value) => Buffer.from(value, 'base64').length === 32, {
  message: 'must be a base64-encoded 32-byte key (generate with `pnpm secrets:generate`)',
});

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    API_BODY_LIMIT: z
      .string()
      .regex(/^\d+(b|kb|mb)$/i, 'must look like 100kb')
      .default('100kb'),
    TRUST_PROXY: z.string().min(1).default('loopback'),

    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    REDIS_URL: z
      .string()
      .trim()
      .regex(/^rediss?:\/\//, 'must be a redis:// or rediss:// URL'),

    WEB_ORIGIN: httpOrigin,
    CORS_ALLOWED_ORIGINS: commaSeparated.pipe(z.array(httpOrigin)).optional(),

    JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
    JWT_ISSUER: z.string().min(1).default('techwin-api'),
    JWT_AUDIENCE: z.string().min(1).default('techwin-platform-admin'),

    TOTP_ENCRYPTION_KEY: aes256Key,
    TOTP_ENCRYPTION_PREVIOUS_KEYS: commaSeparated.pipe(z.array(aes256Key)).optional(),
    TOTP_ISSUER: z.string().min(1).max(64).default('Techwin'),

    COOKIE_SECURE: booleanFlag.optional(),
    SWAGGER_ENABLED: booleanFlag.optional(),
    RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().min(10).default(300),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOG_PRETTY: booleanFlag.default(false),

    /** `local` for development disk storage; `s3` for AWS S3. Defaults to `local` when unset. */
    STORAGE_PROVIDER: z.enum(['local', 's3']).optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).default('ap-south-1'),
    AWS_S3_BUCKET: z.string().min(1).default('techwin-s3'),
    /** Presigned download URL lifetime in seconds. */
    STORAGE_PRESIGNED_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
    /** Employee profile image max upload size in bytes (default 5 MB). */
    STORAGE_EMPLOYEE_PROFILE_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(20 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    /** Background worker that drains `storage_cleanup_jobs` (S3 delete retries). */
    MEDIA_CLEANUP_WORKER_ENABLED: booleanFlag.default(true),
    MEDIA_CLEANUP_INTERVAL_MS: z.coerce.number().int().min(5_000).max(3_600_000).default(60_000),
    MEDIA_CLEANUP_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(20),

    /**
     * WhatsApp Business Cloud API (official Meta Graph API). All optional until a channel is connected;
     * Embedded Signup stays disabled unless META_APP_ID, META_EMBEDDED_SIGNUP_CONFIG_ID and META_APP_SECRET are set.
     * META_APP_SECRET is only a fallback for channels saved without their own encrypted app secret.
     */
    META_APP_ID: optionalUnlessBlank(
      z.string().regex(/^\d{5,32}$/, 'must be a numeric Meta app id'),
    ),
    META_APP_SECRET: optionalUnlessBlank(
      z.string().regex(/^[a-f0-9]{32}$/i, 'must be the 32-character Meta app secret'),
    ),
    META_EMBEDDED_SIGNUP_CONFIG_ID: optionalUnlessBlank(
      z.string().regex(/^\d{5,32}$/, 'must be a numeric Meta configuration id'),
    ),
    META_GRAPH_API_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/, 'must look like v23.0')
      .default('v23.0'),
    META_GRAPH_API_BASE_URL: z
      .url({ protocol: /^https$/, error: 'must be an https URL' })
      .default('https://graph.facebook.com'),
    WHATSAPP_WEBHOOK_BASE_URL: optionalUnlessBlank(
      z.url({ protocol: /^https?$/, error: 'must be an absolute http(s) URL' }),
    ),
    WHATSAPP_CREDENTIALS_ENCRYPTION_KEY: optionalUnlessBlank(aes256Key),
    WHATSAPP_CREDENTIALS_PREVIOUS_KEYS: commaSeparated.pipe(z.array(aes256Key)).optional(),
    WHATSAPP_MEDIA_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1024 * 1024)
      .max(100 * 1024 * 1024)
      .default(16 * 1024 * 1024),
    WHATSAPP_WORKER_ENABLED: booleanFlag.default(true),

    /**
     * When true, background job locks skip work if Redis is unavailable or the lock is held elsewhere.
     * Default false preserves Phase 4B behavior (run without lock when Redis SET fails).
     * Recommended true for multi-replica production when workers are enabled.
     */
    DISTRIBUTED_LOCK_STRICT: booleanFlag.default(false),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET.length < 48) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'must be at least 48 characters in production',
      });
    }
    const storageProvider =
      env.STORAGE_PROVIDER ?? (env.NODE_ENV === 'production' ? 's3' : 'local');
    if (storageProvider === 's3') {
      if (!env.AWS_ACCESS_KEY_ID) {
        context.addIssue({
          code: 'custom',
          path: ['AWS_ACCESS_KEY_ID'],
          message: 'is required when STORAGE_PROVIDER is s3',
        });
      }
      if (!env.AWS_SECRET_ACCESS_KEY) {
        context.addIssue({
          code: 'custom',
          path: ['AWS_SECRET_ACCESS_KEY'],
          message: 'is required when STORAGE_PROVIDER is s3',
        });
      }
    }
    const whatsappIntegrationConfigured =
      Boolean(env.META_APP_ID) ||
      Boolean(env.META_APP_SECRET) ||
      Boolean(env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY);
    const isLocalDevHost = (hostname: string): boolean => {
      const h = hostname.toLowerCase();
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    };

    if (env.NODE_ENV === 'production') {
      try {
        const webOrigin = new URL(env.WEB_ORIGIN);
        if (webOrigin.protocol !== 'https:' && !isLocalDevHost(webOrigin.hostname)) {
          context.addIssue({
            code: 'custom',
            path: ['WEB_ORIGIN'],
            message:
              'must use HTTPS in production (http is allowed only for localhost / 127.0.0.1)',
          });
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['WEB_ORIGIN'],
          message: 'must be a valid absolute URL',
        });
      }
      for (const [index, origin] of (env.CORS_ALLOWED_ORIGINS ?? []).entries()) {
        try {
          const parsed = new URL(origin);
          if (parsed.protocol !== 'https:' && !isLocalDevHost(parsed.hostname)) {
            context.addIssue({
              code: 'custom',
              path: ['CORS_ALLOWED_ORIGINS', index],
              message:
                'each origin must use HTTPS in production (http allowed only for localhost / 127.0.0.1)',
            });
          }
        } catch {
          context.addIssue({
            code: 'custom',
            path: ['CORS_ALLOWED_ORIGINS', index],
            message: 'must be a valid absolute URL',
          });
        }
      }
      const trust = env.TRUST_PROXY.trim().toLowerCase();
      if (trust === 'false' || trust === 'loopback') {
        context.addIssue({
          code: 'custom',
          path: ['TRUST_PROXY'],
          message:
            'must be enabled in production behind a reverse proxy (use 1 or true, or a subnet list)',
        });
      }
      if (env.LOG_PRETTY) {
        context.addIssue({
          code: 'custom',
          path: ['LOG_PRETTY'],
          message: 'must be false in production (structured JSON logs)',
        });
      }
      const placeholderTotpKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      if (env.TOTP_ENCRYPTION_KEY === placeholderTotpKey) {
        context.addIssue({
          code: 'custom',
          path: ['TOTP_ENCRYPTION_KEY'],
          message: 'must not be the placeholder value from .env.example in production',
        });
      }
    }
    if (env.NODE_ENV === 'production' && whatsappIntegrationConfigured) {
      const webhookBase = env.WHATSAPP_WEBHOOK_BASE_URL?.trim();
      if (!webhookBase) {
        context.addIssue({
          code: 'custom',
          path: ['WHATSAPP_WEBHOOK_BASE_URL'],
          message:
            'is required in production when WhatsApp is configured (Meta app id/secret or credentials encryption key is set)',
        });
      } else {
        try {
          const origin = new URL(webhookBase).origin;
          if (!origin.startsWith('https://')) {
            context.addIssue({
              code: 'custom',
              path: ['WHATSAPP_WEBHOOK_BASE_URL'],
              message: 'must use HTTPS in production (Meta requires a public HTTPS webhook URL)',
            });
          }
        } catch {
          context.addIssue({
            code: 'custom',
            path: ['WHATSAPP_WEBHOOK_BASE_URL'],
            message: 'must be a valid absolute URL',
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;
