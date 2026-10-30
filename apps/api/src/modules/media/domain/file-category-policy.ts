import type { StoredObjectCategory } from '../../../generated/prisma/client.js';

export type UploadedFilePayload = {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly size: number;
  readonly originalname: string;
};

export type FileCategoryPolicy = {
  readonly maxBytes: number;
  readonly allowedMimeTypes: ReadonlySet<string>;
};

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function policyForCategory(
  category: StoredObjectCategory,
  employeeProfileMaxBytes: number,
): FileCategoryPolicy {
  switch (category) {
    case 'EMPLOYEE_PROFILE_IMAGE':
      return { maxBytes: employeeProfileMaxBytes, allowedMimeTypes: IMAGE_MIMES };
    default:
      return { maxBytes: employeeProfileMaxBytes, allowedMimeTypes: IMAGE_MIMES };
  }
}

/** Sniff JPEG/PNG/WebP magic bytes; returns MIME or null when unsupported. */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function extensionForMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function sanitizeDisplayFileName(original: string): string {
  const base = original.replace(/[^\w.\-()+\s]/g, '_').trim().slice(0, 200);
  return base.length > 0 ? base : 'upload';
}
