import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  DeleteObjectInput,
  ObjectStoragePort,
  PresignedDownloadInput,
  PutObjectInput,
} from './object-storage.types.js';

const LOCAL_BUCKET = 'local';

/** Disk-backed object storage for development and tests. */
export class LocalObjectStorage implements ObjectStoragePort {
  constructor(private readonly rootDir: string) {}

  private resolvePath(bucket: string, key: string): string {
    if (bucket !== LOCAL_BUCKET) {
      throw new Error('Invalid local storage bucket.');
    }
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('..')) {
      throw new Error('Invalid object key.');
    }
    return join(this.rootDir, normalized);
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const path = this.resolvePath(input.bucket, input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);
  }

  async deleteObject(input: DeleteObjectInput): Promise<void> {
    const path = this.resolvePath(input.bucket, input.key);
    await unlink(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  async getPresignedDownloadUrl(_input: PresignedDownloadInput): Promise<string> {
    throw new Error('Local storage does not issue presigned URLs.');
  }

  async readLocalObject(input: DeleteObjectInput): Promise<{ body: Buffer; contentType: string }> {
    const path = this.resolvePath(input.bucket, input.key);
    const body = await readFile(path);
    const ext = input.key.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
    return { body, contentType };
  }
}

export { LOCAL_BUCKET };
