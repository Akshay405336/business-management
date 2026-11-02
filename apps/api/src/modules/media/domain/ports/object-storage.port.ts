export type PutObjectInput = {
  readonly bucket: string;
  readonly key: string;
  readonly body: Buffer;
  readonly contentType: string;
  readonly contentLength: number;
};

export type DeleteObjectInput = {
  readonly bucket: string;
  readonly key: string;
};

export type PresignedDownloadInput = {
  readonly bucket: string;
  readonly key: string;
  readonly expiresInSeconds: number;
  readonly responseContentType?: string;
  readonly responseContentDisposition?: string;
};

export interface MediaObjectStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  getPresignedDownloadUrl(input: PresignedDownloadInput): Promise<string>;
  readLocalObject?(input: DeleteObjectInput): Promise<{ body: Buffer; contentType: string }>;
  readObject?(input: DeleteObjectInput): Promise<{ body: Buffer; contentType: string }>;
}

export const MEDIA_OBJECT_STORAGE = Symbol('MEDIA_OBJECT_STORAGE');
