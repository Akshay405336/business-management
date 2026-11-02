import type { StoredObjectMetadataResponse } from '@techwin/contracts';
import type { StoredObjectRecord } from '../../../domain/repositories/stored-object.repository.js';
import type { StoredFileService } from '../../../application/services/stored-file.service.js';

export function toStoredObjectMetadataResponse(
  record: StoredObjectRecord,
  storedFiles: StoredFileService,
): StoredObjectMetadataResponse {
  return {
    id: record.id,
    previewUrl: storedFiles.previewPath(record.id),
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    displayFileName: record.displayFileName,
    category: record.category,
    createdAt: record.createdAt,
  };
}
