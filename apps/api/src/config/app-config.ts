import { envSchema, type Env } from './env.schema.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly isProduction: boolean;
  readonly http: {
    readonly host: string;
    readonly port: number;
    readonly bodyLimit: string;
    readonly trustProxy: boolean | number | string;
    readonly webOrigin: string;
    readonly corsAllowedOrigins: readonly string[];
  };
  readonly database: { readonly url: string; readonly poolMax: number };
  readonly redis: { readonly url: string };
  readonly jwt: {
    readonly accessSecret: string;
    readonly issuer: string;
    readonly audience: string;
  };
  readonly totp: {
    readonly issuer: string;
    readonly encryptionKey: Buffer;
    readonly previousEncryptionKeys: readonly Buffer[];
  };
  readonly cookies: { readonly secure: boolean };
  readonly swagger: { readonly enabled: boolean };
  readonly rateLimit: { readonly globalPerMinute: number };
  readonly logging: { readonly level: Env['LOG_LEVEL']; readonly pretty: boolean };
  readonly storage: {
    readonly provider: 'local' | 's3';
    readonly presignedTtlSeconds: number;
    readonly employeeProfileMaxBytes: number;
    readonly s3: {
      readonly region: string;
      readonly bucket: string;
      readonly accessKeyId: string | null;
      readonly secretAccessKey: string | null;
    };
  };
  readonly whatsapp: {
    readonly metaAppId: string | null;
    readonly metaAppSecret: string | null;
    readonly embeddedSignupConfigId: string | null;
    readonly graphApiVersion: string;
    readonly graphApiBaseUrl: string;
    readonly webhookBaseUrl: string | null;
    readonly credentialsEncryptionKey: Buffer | null;
    readonly previousCredentialsEncryptionKeys: readonly Buffer[];
    readonly mediaMaxBytes: number;
    readonly workerEnabled: boolean;
  };
}

export class InvalidEnvironmentError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'InvalidEnvironmentError';
  }
}

/**
 * Express `trust proxy` accepts booleans, hop counts, or comma-separated
 * subnet names/CIDRs (e.g. "loopback, uniquelocal").
 */
function parseTrustProxy(raw: string): boolean | number | string {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

/**
 * Validates the process environment. Error messages name the offending
 * variables but never echo their values.
 */
export function loadAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new InvalidEnvironmentError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  const env = parsed.data;
  const isProduction = env.NODE_ENV === 'production';

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    http: {
      host: env.API_HOST,
      port: env.API_PORT,
      bodyLimit: env.API_BODY_LIMIT,
      trustProxy: parseTrustProxy(env.TRUST_PROXY),
      webOrigin: env.WEB_ORIGIN,
      corsAllowedOrigins: [...new Set([env.WEB_ORIGIN, ...(env.CORS_ALLOWED_ORIGINS ?? [])])],
    },
    database: { url: env.DATABASE_URL, poolMax: env.DATABASE_POOL_MAX },
    redis: { url: env.REDIS_URL },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
    totp: {
      issuer: env.TOTP_ISSUER,
      encryptionKey: Buffer.from(env.TOTP_ENCRYPTION_KEY, 'base64'),
      previousEncryptionKeys: (env.TOTP_ENCRYPTION_PREVIOUS_KEYS ?? []).map((key) =>
        Buffer.from(key, 'base64'),
      ),
    },
    cookies: { secure: env.COOKIE_SECURE ?? isProduction },
    swagger: { enabled: env.SWAGGER_ENABLED ?? !isProduction },
    rateLimit: { globalPerMinute: env.RATE_LIMIT_GLOBAL_PER_MINUTE },
    logging: { level: env.LOG_LEVEL, pretty: env.LOG_PRETTY },
    storage: {
      provider:
        env.STORAGE_PROVIDER ?? (env.NODE_ENV === 'production' ? 's3' : ('local' as const)),
      presignedTtlSeconds: env.STORAGE_PRESIGNED_TTL_SECONDS,
      employeeProfileMaxBytes: env.STORAGE_EMPLOYEE_PROFILE_MAX_BYTES,
      s3: {
        region: env.AWS_REGION,
        bucket: env.AWS_S3_BUCKET,
        accessKeyId: env.AWS_ACCESS_KEY_ID ?? null,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? null,
      },
    },
    whatsapp: {
      metaAppId: env.META_APP_ID ?? null,
      metaAppSecret: env.META_APP_SECRET ?? null,
      embeddedSignupConfigId: env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
      graphApiVersion: env.META_GRAPH_API_VERSION,
      graphApiBaseUrl: env.META_GRAPH_API_BASE_URL.replace(/\/+$/, ''),
      webhookBaseUrl: env.WHATSAPP_WEBHOOK_BASE_URL?.replace(/\/+$/, '') ?? null,
      credentialsEncryptionKey: env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY
        ? Buffer.from(env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY, 'base64')
        : null,
      previousCredentialsEncryptionKeys: (env.WHATSAPP_CREDENTIALS_PREVIOUS_KEYS ?? []).map((key) =>
        Buffer.from(key, 'base64'),
      ),
      mediaMaxBytes: env.WHATSAPP_MEDIA_MAX_BYTES,
      workerEnabled: env.WHATSAPP_WORKER_ENABLED,
    },
  };
}
