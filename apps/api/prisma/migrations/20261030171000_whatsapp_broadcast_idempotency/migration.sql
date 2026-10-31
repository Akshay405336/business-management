-- AlterTable
ALTER TABLE "whatsapp_broadcasts" ADD COLUMN "idempotency_key" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_broadcasts_organization_id_idempotency_key_key" ON "whatsapp_broadcasts"("organization_id", "idempotency_key");
