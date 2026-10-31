import { Inject, Injectable } from '@nestjs/common';
import { StoredFileService } from '../../../media/index.js';
import type { WhatsAppMediaStorePort } from '../../domain/whatsapp.ports.js';

/** WhatsApp media lives in the shared object storage (S3 in production) under its own category. */
@Injectable()
export class WhatsAppMediaStore implements WhatsAppMediaStorePort {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  async store(params: {
    organizationId: string;
    adminId: string;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
    extension: string;
  }): Promise<{ storedObjectId: string; sizeBytes: number }> {
    const stored = await this.storedFiles.storeBuffer({
      organizationId: params.organizationId,
      adminId: params.adminId,
      category: 'WHATSAPP_MEDIA',
      buffer: params.buffer,
      mimeType: params.mimeType,
      fileName: params.fileName,
      extension: params.extension,
    });
    return { storedObjectId: stored.id, sizeBytes: stored.sizeBytes };
  }

  open(
    organizationId: string,
    storedObjectId: string,
  ): Promise<{ redirectUrl?: string; stream?: { body: Buffer; contentType: string } }> {
    return this.storedFiles.openCategoryObject(organizationId, storedObjectId, 'WHATSAPP_MEDIA');
  }
}
