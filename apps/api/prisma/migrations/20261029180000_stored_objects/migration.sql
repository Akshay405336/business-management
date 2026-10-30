-- CreateEnum
CREATE TYPE "StoredObjectProvider" AS ENUM ('S3', 'LOCAL');

-- CreateEnum
CREATE TYPE "StoredObjectCategory" AS ENUM ('EMPLOYEE_PROFILE_IMAGE');

-- CreateEnum
CREATE TYPE "StoredObjectStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "StorageCleanupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "stored_objects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider" "StoredObjectProvider" NOT NULL,
    "bucket" VARCHAR(128) NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "display_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum_sha256" CHAR(64),
    "category" "StoredObjectCategory" NOT NULL,
    "status" "StoredObjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_admin_id" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_cleanup_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stored_object_id" UUID NOT NULL,
    "status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(2000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "storage_cleanup_jobs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "profile_image_stored_object_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "stored_objects_provider_bucket_object_key_key" ON "stored_objects"("provider", "bucket", "object_key");

-- CreateIndex
CREATE INDEX "stored_objects_organization_id_category_status_idx" ON "stored_objects"("organization_id", "category", "status");

-- CreateIndex
CREATE INDEX "storage_cleanup_jobs_status_updated_at_idx" ON "storage_cleanup_jobs"("status", "updated_at");

-- CreateIndex
CREATE INDEX "storage_cleanup_jobs_organization_id_stored_object_id_idx" ON "storage_cleanup_jobs"("organization_id", "stored_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_profile_image_stored_object_id_key" ON "employees"("profile_image_stored_object_id");

-- AddForeignKey
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_cleanup_jobs" ADD CONSTRAINT "storage_cleanup_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_profile_image_stored_object_id_fkey" FOREIGN KEY ("profile_image_stored_object_id") REFERENCES "stored_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
