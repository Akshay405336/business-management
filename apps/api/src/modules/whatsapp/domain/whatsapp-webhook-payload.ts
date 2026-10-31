/**
 * Defensive normalizer for Meta WhatsApp Cloud API webhook payloads. Anything
 * unexpected becomes an UNSUPPORTED message rather than an exception, so one
 * odd item never blocks the rest of a batch.
 */

export type InboundMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'STICKER'
  | 'LOCATION'
  | 'CONTACTS'
  | 'INTERACTIVE'
  | 'BUTTON'
  | 'REACTION'
  | 'UNSUPPORTED';

export interface InboundMedia {
  readonly providerMediaId: string;
  readonly mimeType: string;
  readonly fileName: string | null;
}

export interface InboundMessage {
  readonly providerMessageId: string;
  readonly fromWaId: string;
  readonly profileName: string;
  readonly timestamp: Date;
  readonly type: InboundMessageType;
  readonly body: string;
  readonly payload: Record<string, unknown> | null;
  readonly media: InboundMedia | null;
}

export type ReceiptStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface StatusReceipt {
  readonly providerMessageId: string;
  readonly status: ReceiptStatus;
  readonly timestamp: Date;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
}

export interface TemplateStatusChange {
  readonly providerTemplateId: string;
  readonly status: string;
  readonly reason: string | null;
}

export interface NormalizedWebhookBatch {
  readonly messages: readonly InboundMessage[];
  readonly statuses: readonly StatusReceipt[];
  readonly templateUpdates: readonly TemplateStatusChange[];
  /** Changes addressed to a different phone number or business account than the channel. */
  readonly foreignChanges: number;
}

type Json = Record<string, unknown>;

function obj(value: unknown): Json | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, max = 4096): string {
  if (typeof value === 'string') return value.slice(0, max);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function timestampOf(value: unknown): Date {
  const seconds = num(value);
  return seconds === null ? new Date() : new Date(seconds * 1000);
}

function mediaOf(source: Json | null, fallbackMime: string): InboundMedia | null {
  if (!source) return null;
  const providerMediaId = str(source.id, 128);
  if (!providerMediaId) return null;
  return {
    providerMediaId,
    mimeType: str(source.mime_type, 128) || fallbackMime,
    fileName: str(source.filename, 255) || null,
  };
}

function normalizeMessage(
  raw: Json,
  profileNames: ReadonlyMap<string, string>,
): InboundMessage | null {
  const providerMessageId = str(raw.id, 128);
  const fromWaId = str(raw.from, 32).replace(/\D/g, '');
  if (!providerMessageId || !fromWaId) return null;

  const base = {
    providerMessageId,
    fromWaId,
    profileName: profileNames.get(fromWaId) ?? '',
    timestamp: timestampOf(raw.timestamp),
  };
  const context = obj(raw.context);
  const contextPayload = context ? { replyTo: str(context.id, 128) || null } : {};
  const type = str(raw.type, 32);

  switch (type) {
    case 'text': {
      const text = obj(raw.text);
      return {
        ...base,
        type: 'TEXT',
        body: str(text?.body),
        payload: context ? contextPayload : null,
        media: null,
      };
    }
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker': {
      const source = obj(raw[type]);
      const media = mediaOf(source, 'application/octet-stream');
      return {
        ...base,
        type: type.toUpperCase() as InboundMessageType,
        body: str(source?.caption, 1024),
        payload: {
          ...contextPayload,
          ...(source?.voice === true ? { voice: true } : {}),
        },
        media,
      };
    }
    case 'location': {
      const location = obj(raw.location);
      return {
        ...base,
        type: 'LOCATION',
        body: str(location?.name, 200),
        payload: {
          latitude: num(location?.latitude),
          longitude: num(location?.longitude),
          name: str(location?.name, 200) || null,
          address: str(location?.address, 500) || null,
        },
        media: null,
      };
    }
    case 'contacts': {
      const contacts = arr(raw.contacts)
        .slice(0, 10)
        .map((item) => {
          const contact = obj(item);
          const name = obj(contact?.name);
          return {
            name: str(name?.formatted_name, 200),
            phones: arr(contact?.phones)
              .slice(0, 5)
              .map((phone) => str(obj(phone)?.phone, 40))
              .filter(Boolean),
          };
        });
      return { ...base, type: 'CONTACTS', body: '', payload: { contacts }, media: null };
    }
    case 'interactive': {
      const interactive = obj(raw.interactive);
      const reply = obj(interactive?.button_reply) ?? obj(interactive?.list_reply);
      return {
        ...base,
        type: 'INTERACTIVE',
        body: str(reply?.title, 200),
        payload: {
          interactiveType: str(interactive?.type, 32),
          replyId: str(reply?.id, 256) || null,
          description: str(reply?.description, 500) || null,
        },
        media: null,
      };
    }
    case 'button': {
      const button = obj(raw.button);
      return {
        ...base,
        type: 'BUTTON',
        body: str(button?.text, 200),
        payload: { buttonPayload: str(button?.payload, 256) || null, ...contextPayload },
        media: null,
      };
    }
    case 'reaction': {
      const reaction = obj(raw.reaction);
      return {
        ...base,
        type: 'REACTION',
        body: str(reaction?.emoji, 16),
        payload: { reactedTo: str(reaction?.message_id, 128) || null },
        media: null,
      };
    }
    default:
      return {
        ...base,
        type: 'UNSUPPORTED',
        body: '',
        payload: { providerType: type || 'unknown' },
        media: null,
      };
  }
}

function normalizeStatus(raw: Json): StatusReceipt | null {
  const providerMessageId = str(raw.id, 128);
  const status = str(raw.status, 16).toUpperCase();
  if (!providerMessageId) return null;
  if (status !== 'SENT' && status !== 'DELIVERED' && status !== 'READ' && status !== 'FAILED') {
    return null;
  }
  const firstError = obj(arr(raw.errors)[0]);
  const details = obj(firstError?.error_data);
  return {
    providerMessageId,
    status,
    timestamp: timestampOf(raw.timestamp),
    errorCode: firstError ? str(firstError.code, 64) || null : null,
    errorMessage: firstError
      ? str(details?.details, 500) ||
        str(firstError.message, 500) ||
        str(firstError.title, 500) ||
        null
      : null,
  };
}

export function normalizeWebhookPayload(
  payload: unknown,
  expected: { readonly businessAccountId: string; readonly phoneNumberId: string },
): NormalizedWebhookBatch {
  const messages: InboundMessage[] = [];
  const statuses: StatusReceipt[] = [];
  const templateUpdates: TemplateStatusChange[] = [];
  let foreignChanges = 0;

  const root = obj(payload);
  if (!root || root.object !== 'whatsapp_business_account') {
    return { messages, statuses, templateUpdates, foreignChanges };
  }

  for (const entryRaw of arr(root.entry)) {
    const entry = obj(entryRaw);
    if (!entry) continue;
    const entryAccountId = str(entry.id, 32);
    for (const changeRaw of arr(entry.changes)) {
      const change = obj(changeRaw);
      const value = obj(change?.value);
      if (!change || !value) continue;

      if (change.field === 'message_template_status_update') {
        if (entryAccountId !== expected.businessAccountId) {
          foreignChanges += 1;
          continue;
        }
        const providerTemplateId = str(value.message_template_id, 64);
        const status = str(value.event, 32).toUpperCase();
        if (providerTemplateId && status) {
          templateUpdates.push({
            providerTemplateId,
            status,
            reason: str(value.reason, 255) || null,
          });
        }
        continue;
      }

      if (change.field !== 'messages') continue;
      const metadata = obj(value.metadata);
      if (str(metadata?.phone_number_id, 32) !== expected.phoneNumberId) {
        foreignChanges += 1;
        continue;
      }

      const profileNames = new Map<string, string>();
      for (const contactRaw of arr(value.contacts)) {
        const contact = obj(contactRaw);
        const waId = str(contact?.wa_id, 32).replace(/\D/g, '');
        const name = str(obj(contact?.profile)?.name, 160);
        if (waId) profileNames.set(waId, name);
      }
      for (const messageRaw of arr(value.messages)) {
        const message = obj(messageRaw);
        const normalized = message ? normalizeMessage(message, profileNames) : null;
        if (normalized) messages.push(normalized);
      }
      for (const statusRaw of arr(value.statuses)) {
        const status = obj(statusRaw);
        const normalized = status ? normalizeStatus(status) : null;
        if (normalized) statuses.push(normalized);
      }
    }
  }

  return { messages, statuses, templateUpdates, foreignChanges };
}
