import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Authenticated encryption envelope: `v1.<keyId>.<iv>.<tag>.<ciphertext>`
 * (base64url parts). The key id lets callers pick the right key after a key
 * rotation; the associated data binds a ciphertext to its owner record so it
 * cannot be copied onto another row.
 */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class EnvelopeDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeDecryptionError';
  }
}

export function deriveKeyId(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function assertKey(key: Buffer): void {
  if (key.length !== 32) throw new Error('AES-256-GCM requires a 32-byte key.');
}

export function sealEnvelope(key: Buffer, plaintext: string, associatedData: string): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    VERSION,
    deriveKeyId(key),
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export interface ParsedEnvelope {
  readonly keyId: string;
  readonly iv: Buffer;
  readonly tag: Buffer;
  readonly ciphertext: Buffer;
}

export function parseEnvelope(envelope: string): ParsedEnvelope {
  const parts = envelope.split('.');
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new EnvelopeDecryptionError('Unsupported ciphertext envelope.');
  }
  const [, keyId, iv, tag, ciphertext] = parts as [string, string, string, string, string];
  return {
    keyId,
    iv: Buffer.from(iv, 'base64url'),
    tag: Buffer.from(tag, 'base64url'),
    ciphertext: Buffer.from(ciphertext, 'base64url'),
  };
}

export function openEnvelope(
  key: Buffer,
  envelope: ParsedEnvelope,
  associatedData: string,
): string {
  assertKey(key);
  if (envelope.keyId !== deriveKeyId(key)) {
    throw new EnvelopeDecryptionError('Ciphertext was sealed with a different key.');
  }
  if (envelope.iv.length !== IV_BYTES || envelope.tag.length !== TAG_BYTES) {
    throw new EnvelopeDecryptionError('Malformed ciphertext envelope.');
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, envelope.iv, { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));
    decipher.setAuthTag(envelope.tag);
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new EnvelopeDecryptionError('Ciphertext failed authentication.');
  }
}
