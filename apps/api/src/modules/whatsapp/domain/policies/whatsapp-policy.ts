/** Meta customer-service window: free-form replies are allowed for 24h after the last inbound message. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function serviceWindowEndsAt(lastInboundAt: Date | null): Date | null {
  return lastInboundAt ? new Date(lastInboundAt.getTime() + SERVICE_WINDOW_MS) : null;
}

export function isWithinServiceWindow(lastInboundAt: Date | null, now: Date): boolean {
  const endsAt = serviceWindowEndsAt(lastInboundAt);
  return endsAt !== null && endsAt.getTime() > now.getTime();
}

export type OutboundStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

const OUTBOUND_RANK: Record<Exclude<OutboundStatus, 'FAILED'>, number> = {
  QUEUED: 0,
  SENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
};

/**
 * Receipts arrive out of order and may repeat. Status only moves forward;
 * a failure never overrides proof of delivery or read.
 */
export function canApplyOutboundStatus(current: string, next: OutboundStatus): boolean {
  if (current === next) return false;
  if (current === 'FAILED') return next === 'SENT' || next === 'DELIVERED' || next === 'READ';
  if (next === 'FAILED') return current !== 'DELIVERED' && current !== 'READ';
  const currentRank = OUTBOUND_RANK[current as keyof typeof OUTBOUND_RANK];
  if (currentRank === undefined) return false;
  return OUTBOUND_RANK[next] > currentRank;
}

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER';

type MediaRule = {
  readonly kind: MediaKind;
  readonly extension: string;
  readonly metaMaxBytes: number;
};

const MB = 1024 * 1024;

/** MIME types accepted by the WhatsApp Cloud API, with Meta's per-type size ceilings. */
const MEDIA_RULES: Readonly<Record<string, MediaRule>> = {
  'image/jpeg': { kind: 'IMAGE', extension: 'jpg', metaMaxBytes: 5 * MB },
  'image/png': { kind: 'IMAGE', extension: 'png', metaMaxBytes: 5 * MB },
  'image/webp': { kind: 'STICKER', extension: 'webp', metaMaxBytes: 1 * MB },
  'video/mp4': { kind: 'VIDEO', extension: 'mp4', metaMaxBytes: 16 * MB },
  'video/3gpp': { kind: 'VIDEO', extension: '3gp', metaMaxBytes: 16 * MB },
  'audio/aac': { kind: 'AUDIO', extension: 'aac', metaMaxBytes: 16 * MB },
  'audio/amr': { kind: 'AUDIO', extension: 'amr', metaMaxBytes: 16 * MB },
  'audio/mpeg': { kind: 'AUDIO', extension: 'mp3', metaMaxBytes: 16 * MB },
  'audio/mp4': { kind: 'AUDIO', extension: 'm4a', metaMaxBytes: 16 * MB },
  'audio/ogg': { kind: 'AUDIO', extension: 'ogg', metaMaxBytes: 16 * MB },
  'text/plain': { kind: 'DOCUMENT', extension: 'txt', metaMaxBytes: 100 * MB },
  'application/pdf': { kind: 'DOCUMENT', extension: 'pdf', metaMaxBytes: 100 * MB },
  'application/msword': { kind: 'DOCUMENT', extension: 'doc', metaMaxBytes: 100 * MB },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    kind: 'DOCUMENT',
    extension: 'docx',
    metaMaxBytes: 100 * MB,
  },
  'application/vnd.ms-excel': { kind: 'DOCUMENT', extension: 'xls', metaMaxBytes: 100 * MB },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    kind: 'DOCUMENT',
    extension: 'xlsx',
    metaMaxBytes: 100 * MB,
  },
  'application/vnd.ms-powerpoint': { kind: 'DOCUMENT', extension: 'ppt', metaMaxBytes: 100 * MB },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    kind: 'DOCUMENT',
    extension: 'pptx',
    metaMaxBytes: 100 * MB,
  },
};

/** Strips parameters such as `; codecs=opus` and lower-cases the type. */
export function baseMimeType(mime: string): string {
  return (mime.split(';')[0] ?? '').trim().toLowerCase();
}

export function mediaRuleFor(mime: string): MediaRule | null {
  return MEDIA_RULES[baseMimeType(mime)] ?? null;
}

export function effectiveMediaLimit(rule: MediaRule, configuredMaxBytes: number): number {
  return Math.min(rule.metaMaxBytes, configuredMaxBytes);
}

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((value, index) => bytes[offset + index] === value);

const ascii = (text: string): number[] => [...text].map((char) => char.charCodeAt(0));

const OLE_COMPOUND = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP = [0x50, 0x4b, 0x03, 0x04];

/** Checks the leading bytes against the declared type so a renamed file cannot pass as another format. */
export function contentMatchesMimeType(mime: string, bytes: Uint8Array): boolean {
  switch (baseMimeType(mime)) {
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      return startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8);
    case 'video/mp4':
    case 'video/3gpp':
    case 'audio/mp4':
      return startsWith(bytes, ascii('ftyp'), 4);
    case 'audio/ogg':
      return startsWith(bytes, ascii('OggS'));
    case 'audio/amr':
      return startsWith(bytes, ascii('#!AMR'));
    case 'audio/mpeg':
      return (
        startsWith(bytes, ascii('ID3')) ||
        (bytes.length > 1 && bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
      );
    case 'audio/aac':
      return (
        startsWith(bytes, ascii('ADIF')) ||
        (bytes.length > 1 && bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xf6) === 0xf0)
      );
    case 'application/pdf':
      return startsWith(bytes, ascii('%PDF-'));
    case 'application/msword':
    case 'application/vnd.ms-excel':
    case 'application/vnd.ms-powerpoint':
      return startsWith(bytes, OLE_COMPOUND);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return startsWith(bytes, ZIP);
    case 'text/plain':
      return !bytes.subarray(0, 8192).includes(0);
    default:
      return false;
  }
}

/** Outgoing attachments. Meta only accepts JPEG/PNG images, so WebP (sticker-only) is refused. */
export function outboundMediaKind(mime: string): Exclude<MediaKind, 'STICKER'> | null {
  const rule = mediaRuleFor(mime);
  if (!rule || rule.kind === 'STICKER') return null;
  return rule.kind;
}

const OPT_OUT_KEYWORDS = new Set(['stop', 'unsubscribe', 'stop all', 'opt out', 'optout']);

/**
 * An exact opt-out keyword sent by the customer. Opt-in is never inferred from
 * message content; staff record it explicitly with its source.
 */
export function isOptOutKeyword(text: string): boolean {
  return OPT_OUT_KEYWORDS.has(text.trim().toLowerCase().replace(/\s+/g, ' '));
}

export type TemplateParameter = {
  readonly component: 'HEADER' | 'BODY' | 'BUTTON';
  readonly index: number;
  readonly name: string;
};

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export function templatePlaceholders(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** Customer-specific substitution tokens allowed in broadcast variables. */
export function resolveBroadcastVariable(
  value: string,
  contact: { readonly name: string; readonly phoneE164: string },
): string {
  return value
    .replace(/\{\{\s*contact\.name\s*\}\}/gi, contact.name || 'there')
    .replace(/\{\{\s*contact\.phone\s*\}\}/gi, contact.phoneE164);
}

export const PREVIEW_MAX = 280;

export function messagePreview(type: string, body: string): string {
  const text = body.trim();
  if (text.length > 0)
    return text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX - 1)}…` : text;
  switch (type) {
    case 'IMAGE':
      return '📷 Photo';
    case 'VIDEO':
      return '🎥 Video';
    case 'AUDIO':
      return '🎤 Audio';
    case 'DOCUMENT':
      return '📄 Document';
    case 'STICKER':
      return 'Sticker';
    case 'LOCATION':
      return '📍 Location';
    case 'CONTACTS':
      return '👤 Contact card';
    case 'REACTION':
      return 'Reaction';
    case 'TEMPLATE':
      return 'Template message';
    default:
      return 'Unsupported message';
  }
}

/** Exponential backoff for retryable provider failures (capped at 15 minutes). */
export function retryDelayMs(attempt: number): number {
  return Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, attempt - 1));
}

export const MAX_SEND_ATTEMPTS = 5;
export const MAX_WEBHOOK_ATTEMPTS = 8;
