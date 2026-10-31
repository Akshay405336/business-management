import { API_PREFIX } from './http.js';

export const MEDIA_ROUTES = {
  storedObjects: `${API_PREFIX}/media/objects`,
  storedObject: (id: string) => `${API_PREFIX}/media/objects/${id}`,
  storedObjectContent: (id: string) => `${API_PREFIX}/media/objects/${id}/content`,
} as const;

export type StoredObjectCategory = 'EMPLOYEE_PROFILE_IMAGE' | 'WHATSAPP_MEDIA';

export interface StoredObjectUploadResponse {
  readonly id: string;
  readonly previewUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly displayFileName: string;
}

export interface StoredObjectMetadataResponse {
  readonly id: string;
  readonly previewUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly displayFileName: string;
  readonly category: StoredObjectCategory;
  readonly createdAt: string;
}
