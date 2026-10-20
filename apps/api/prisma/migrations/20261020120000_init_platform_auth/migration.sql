-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "PlatformSessionRevocationReason" AS ENUM ('LOGOUT', 'LOGOUT_ALL', 'REVOKED', 'REFRESH_TOKEN_REUSE', 'CREDENTIALS_RESET');

-- CreateEnum
CREATE TYPE "PlatformAuditEventType" AS ENUM ('SUPER_ADMIN_BOOTSTRAPPED', 'SUPER_ADMIN_CREDENTIALS_RESET', 'PASSWORD_LOGIN_FAILED', 'PASSWORD_VERIFIED', 'TOTP_FAILED', 'SESSION_CREATED', 'REFRESH_TOKEN_REUSE_DETECTED', 'SESSION_REVOKED', 'LOGOUT', 'LOGOUT_ALL_DEVICES');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "role" "PlatformAdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" TEXT NOT NULL,
    "totp_secret_ciphertext" TEXT NOT NULL,
    "totp_enrolled_at" TIMESTAMPTZ(3),
    "last_totp_time_step" BIGINT,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_auth_challenges" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_sessions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "csrf_token_hash" CHAR(64) NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_reason" "PlatformSessionRevocationReason",

    CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_tokens" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "rotated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_events" (
    "id" UUID NOT NULL,
    "admin_id" UUID,
    "type" "PlatformAuditEventType" NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_auth_challenges_token_hash_key" ON "platform_auth_challenges"("token_hash");

-- CreateIndex
CREATE INDEX "platform_auth_challenges_admin_id_expires_at_idx" ON "platform_auth_challenges"("admin_id", "expires_at");

-- CreateIndex
CREATE INDEX "platform_sessions_admin_id_revoked_at_expires_at_idx" ON "platform_sessions"("admin_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_tokens_token_hash_key" ON "platform_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "platform_refresh_tokens_session_id_idx" ON "platform_refresh_tokens"("session_id");

-- CreateIndex
CREATE INDEX "platform_audit_events_admin_id_created_at_idx" ON "platform_audit_events"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_events_type_created_at_idx" ON "platform_audit_events"("type", "created_at");

-- AddForeignKey
ALTER TABLE "platform_auth_challenges" ADD CONSTRAINT "platform_auth_challenges_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_refresh_tokens" ADD CONSTRAINT "platform_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "platform_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_events" ADD CONSTRAINT "platform_audit_events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Emails must be stored in normalized form so the unique index is case-insensitive.
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_email_normalized_check" CHECK ("email" = lower(btrim("email")));
