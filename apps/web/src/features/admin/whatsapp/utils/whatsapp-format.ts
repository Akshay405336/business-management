import type {
  WhatsAppChannelStatus,
  WhatsAppConsentStatus,
  WhatsAppConversationStatus,
  WhatsAppMessageStatus,
} from '@techwin/contracts';
import { isApiError } from '@/shared/api/api-error';

export function describeWhatsAppError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isApiError(error)) {
    if (error.status === 429 && error.retryAfterSeconds) {
      return `${error.message} Try again in ${error.retryAfterSeconds}s.`;
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.name === 'Error' && error.message) return error.message;
  return fallback;
}

/** Client-generated key so a retried request never sends the same message twice. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** 32 random URL-safe characters for the Meta webhook verify token. */
export function generateVerifyToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function formatRelativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const diff = now - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '#';
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase();
}

export const CHANNEL_STATUS_META: Record<
  WhatsAppChannelStatus,
  { label: string; className: string }
> = {
  CONNECTED: { label: 'Connected', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  PENDING_SETUP: {
    label: 'Pending Setup',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  WEBHOOK_NOT_VERIFIED: {
    label: 'Webhook Not Verified',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  CONNECTION_ERROR: {
    label: 'Connection Error',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  DISCONNECTED: {
    label: 'Disconnected',
    className: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  },
};

export const CONVERSATION_STATUS_META: Record<
  WhatsAppConversationStatus,
  { label: string; className: string }
> = {
  NEW: { label: 'New', className: 'border-sky-200 bg-sky-50 text-sky-800' },
  OPEN: { label: 'Open', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  RESOLVED: { label: 'Resolved', className: 'border-neutral-200 bg-neutral-100 text-neutral-600' },
  SPAM: { label: 'Spam', className: 'border-red-200 bg-red-50 text-red-700' },
};

export const CONSENT_META: Record<WhatsAppConsentStatus, { label: string; className: string }> = {
  OPTED_IN: { label: 'Opted in', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  OPTED_OUT: { label: 'Opted out', className: 'border-red-200 bg-red-50 text-red-700' },
  UNKNOWN: {
    label: 'No consent recorded',
    className: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  },
};

export const MESSAGE_STATUS_LABEL: Record<WhatsAppMessageStatus, string> = {
  RECEIVED: 'Received',
  QUEUED: 'Queued',
  SENDING: 'Sending',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed',
};

export const TEMPLATE_STATUS_CLASS: Record<string, string> = {
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  IN_APPEAL: 'border-amber-200 bg-amber-50 text-amber-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  PAUSED: 'border-orange-200 bg-orange-50 text-orange-700',
  DISABLED: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  DELETED: 'border-neutral-200 bg-neutral-100 text-neutral-500',
};
