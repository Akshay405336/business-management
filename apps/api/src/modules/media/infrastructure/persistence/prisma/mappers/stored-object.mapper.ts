import type { StoredObjectRecord } from '../../../../domain/repositories/stored-object.repository.js';

export function mapStoredObjectRow(row: {
  id: string;
  organizationId: string;
  provider: StoredObjectRecord['provider'];
  bucket: string;
  objectKey: string;
  originalFileName: string;
  displayFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string | null;
  category: StoredObjectRecord['category'];
  status: StoredObjectRecord['status'];
  createdByAdminId: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StoredObjectRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    provider: row.provider,
    bucket: row.bucket,
    objectKey: row.objectKey,
    originalFileName: row.originalFileName,
    displayFileName: row.displayFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    category: row.category,
    status: row.status,
    createdByAdminId: row.createdByAdminId,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
