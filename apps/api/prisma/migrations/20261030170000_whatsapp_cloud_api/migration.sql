-- CreateEnum
CREATE TYPE "WhatsAppChannelStatus" AS ENUM ('PENDING_SETUP', 'CONNECTED', 'WEBHOOK_NOT_VERIFIED', 'CONNECTION_ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionMethod" AS ENUM ('MANUAL', 'EMBEDDED_SIGNUP');

-- CreateEnum
CREATE TYPE "WhatsAppWebhookEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppConsentStatus" AS ENUM ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('NEW', 'OPEN', 'RESOLVED', 'SPAM');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACTS', 'INTERACTIVE', 'BUTTON', 'REACTION', 'TEMPLATE', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppMediaStatus" AS ENUM ('NONE', 'PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppConversationEventType" AS ENUM ('CONVERSATION_CREATED', 'MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_UPDATED', 'NOTE_ADDED', 'ASSIGNED', 'STATUS_CHANGED', 'CONTACT_UPDATED');

-- CreateEnum
CREATE TYPE "WhatsAppBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppBroadcastRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CHANNEL_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CHANNEL_UPDATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CHANNEL_CREDENTIALS_ROTATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CHANNEL_DISCONNECTED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CHANNEL_DELETED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_TEMPLATES_SYNCED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_TEMPLATE_SUBMITTED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_BROADCAST_CREATED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_BROADCAST_CONFIRMED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_BROADCAST_CANCELLED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CONTACT_CONSENT_CHANGED';
ALTER TYPE "CrmAuditEventType" ADD VALUE 'WHATSAPP_CONVERSATION_ASSIGNED';

-- AlterEnum
ALTER TYPE "StoredObjectCategory" ADD VALUE 'WHATSAPP_MEDIA';

-- CreateTable
CREATE TABLE "whatsapp_channels" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "webhook_key" VARCHAR(64) NOT NULL,
    "connection_method" "WhatsAppConnectionMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "WhatsAppChannelStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "meta_app_id" VARCHAR(32),
    "business_account_id" VARCHAR(32) NOT NULL,
    "phone_number_id" VARCHAR(32) NOT NULL,
    "display_phone_number" VARCHAR(32) NOT NULL DEFAULT '',
    "verified_name" VARCHAR(160) NOT NULL DEFAULT '',
    "quality_rating" VARCHAR(32),
    "messaging_limit_tier" VARCHAR(32),
    "access_token_ciphertext" TEXT,
    "access_token_last4" VARCHAR(4),
    "app_secret_ciphertext" TEXT,
    "verify_token_hash" CHAR(64),
    "credentials_updated_at" TIMESTAMPTZ(3),
    "last_verified_at" TIMESTAMPTZ(3),
    "last_error_code" VARCHAR(64),
    "last_error_message" VARCHAR(500),
    "webhook_verified_at" TIMESTAMPTZ(3),
    "last_webhook_at" TIMESTAMPTZ(3),
    "templates_synced_at" TIMESTAMPTZ(3),
    "disconnected_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "payload_sha256" CHAR(64) NOT NULL,
    "payload" JSONB,
    "status" "WhatsAppWebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ(3),
    "last_error" VARCHAR(500),
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),

    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "wa_id" VARCHAR(32) NOT NULL,
    "phone_e164" VARCHAR(20) NOT NULL,
    "profile_name" VARCHAR(160) NOT NULL DEFAULT '',
    "lead_id" UUID,
    "client_id" UUID,
    "consent_status" "WhatsAppConsentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consent_source" VARCHAR(160) NOT NULL DEFAULT '',
    "consent_updated_at" TIMESTAMPTZ(3),
    "consent_updated_by_admin_id" UUID,
    "last_inbound_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'NEW',
    "assigned_employee_id" UUID,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" VARCHAR(280) NOT NULL DEFAULT '',
    "last_message_direction" "WhatsAppMessageDirection",
    "last_inbound_at" TIMESTAMPTZ(3),
    "first_response_at" TIMESTAMPTZ(3),
    "resolved_at" TIMESTAMPTZ(3),
    "resolved_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL,
    "provider_message_id" VARCHAR(128),
    "idempotency_key" VARCHAR(64),
    "body" TEXT NOT NULL DEFAULT '',
    "payload" JSONB,
    "media_status" "WhatsAppMediaStatus" NOT NULL DEFAULT 'NONE',
    "media_provider_id" VARCHAR(128),
    "media_stored_object_id" UUID,
    "media_mime_type" VARCHAR(128),
    "media_file_name" VARCHAR(255),
    "media_size_bytes" INTEGER,
    "template_id" UUID,
    "broadcast_id" UUID,
    "sent_by_admin_id" UUID,
    "error_code" VARCHAR(64),
    "error_message" VARCHAR(500),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3),
    "provider_timestamp" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "failed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversation_events" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "message_id" UUID,
    "type" "WhatsAppConversationEventType" NOT NULL,
    "actor_admin_id" UUID,
    "body" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_conversation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "provider_template_id" VARCHAR(64),
    "name" VARCHAR(512) NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "rejected_reason" VARCHAR(255),
    "quality_score" VARCHAR(32),
    "components" JSONB NOT NULL,
    "body_text" TEXT NOT NULL DEFAULT '',
    "variable_count" INTEGER NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_broadcasts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "template_variables" JSONB NOT NULL,
    "audience" JSONB NOT NULL,
    "status" "WhatsAppBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "created_by_admin_id" UUID NOT NULL,
    "confirmed_by_admin_id" UUID,
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_broadcast_recipients" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "broadcast_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "status" "WhatsAppBroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "message_id" UUID,
    "error_message" VARCHAR(500),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "whatsapp_broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_channels_webhook_key_key" ON "whatsapp_channels"("webhook_key");

-- CreateIndex
CREATE INDEX "whatsapp_channels_organization_id_deleted_at_idx" ON "whatsapp_channels"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "whatsapp_channels_phone_number_id_idx" ON "whatsapp_channels"("phone_number_id");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_status_next_attempt_at_idx" ON "whatsapp_webhook_events"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "whatsapp_webhook_events_organization_id_received_at_idx" ON "whatsapp_webhook_events"("organization_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_webhook_events_channel_id_payload_sha256_key" ON "whatsapp_webhook_events"("channel_id", "payload_sha256");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_organization_id_lead_id_idx" ON "whatsapp_contacts"("organization_id", "lead_id");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_organization_id_client_id_idx" ON "whatsapp_contacts"("organization_id", "client_id");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_organization_id_consent_status_idx" ON "whatsapp_contacts"("organization_id", "consent_status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_organization_id_wa_id_key" ON "whatsapp_contacts"("organization_id", "wa_id");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organization_id_status_last_message__idx" ON "whatsapp_conversations"("organization_id", "status", "last_message_at");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_organization_id_assigned_employee_id_idx" ON "whatsapp_conversations"("organization_id", "assigned_employee_id", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_channel_id_contact_id_key" ON "whatsapp_conversations"("channel_id", "contact_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_organization_id_created_at_idx" ON "whatsapp_messages"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_next_attempt_at_idx" ON "whatsapp_messages"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "whatsapp_messages_media_stored_object_id_idx" ON "whatsapp_messages"("media_stored_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_channel_id_provider_message_id_key" ON "whatsapp_messages"("channel_id", "provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_organization_id_idempotency_key_key" ON "whatsapp_messages"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "whatsapp_conversation_events_organization_id_id_idx" ON "whatsapp_conversation_events"("organization_id", "id");

-- CreateIndex
CREATE INDEX "whatsapp_conversation_events_conversation_id_id_idx" ON "whatsapp_conversation_events"("conversation_id", "id");

-- CreateIndex
CREATE INDEX "whatsapp_templates_organization_id_status_idx" ON "whatsapp_templates"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_channel_id_name_language_key" ON "whatsapp_templates"("channel_id", "name", "language");

-- CreateIndex
CREATE INDEX "whatsapp_broadcasts_organization_id_created_at_idx" ON "whatsapp_broadcasts"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_broadcasts_status_scheduled_at_idx" ON "whatsapp_broadcasts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_broadcast_recipients_message_id_key" ON "whatsapp_broadcast_recipients"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_broadcast_recipients_broadcast_id_status_idx" ON "whatsapp_broadcast_recipients"("broadcast_id", "status");

-- CreateIndex
CREATE INDEX "whatsapp_broadcast_recipients_status_next_attempt_at_idx" ON "whatsapp_broadcast_recipients"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_broadcast_recipients_broadcast_id_contact_id_key" ON "whatsapp_broadcast_recipients"("broadcast_id", "contact_id");

-- AddForeignKey
ALTER TABLE "whatsapp_channels" ADD CONSTRAINT "whatsapp_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversation_events" ADD CONSTRAINT "whatsapp_conversation_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversation_events" ADD CONSTRAINT "whatsapp_conversation_events_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcasts" ADD CONSTRAINT "whatsapp_broadcasts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcasts" ADD CONSTRAINT "whatsapp_broadcasts_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "whatsapp_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcasts" ADD CONSTRAINT "whatsapp_broadcasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "whatsapp_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcast_recipients" ADD CONSTRAINT "whatsapp_broadcast_recipients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcast_recipients" ADD CONSTRAINT "whatsapp_broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "whatsapp_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_broadcast_recipients" ADD CONSTRAINT "whatsapp_broadcast_recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

