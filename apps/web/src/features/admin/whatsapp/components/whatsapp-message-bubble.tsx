'use client';

import type { WhatsAppMessageView, WhatsAppTimelineEvent } from '@techwin/contracts';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  Contact,
  FileText,
  ImageOff,
  MapPin,
  RotateCcw,
  StickyNote,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { loadWhatsAppMediaUrl } from '../api/whatsapp';
import { formatBytes, formatTime, MESSAGE_STATUS_LABEL } from '../utils/whatsapp-format';

function useMediaUrl(path: string | null): { url: string | null; failed: boolean } {
  const [state, setState] = useState<{ url: string | null; failed: boolean }>({
    url: null,
    failed: false,
  });
  useEffect(() => {
    if (!path) return;
    let active = true;
    loadWhatsAppMediaUrl(path)
      .then((url) => active && setState({ url, failed: false }))
      .catch(() => active && setState({ url: null, failed: true }));
    return () => {
      active = false;
    };
  }, [path]);
  return path ? state : { url: null, failed: false };
}

function MediaContent({ message }: { message: WhatsAppMessageView }) {
  const media = message.media;
  const { url, failed } = useMediaUrl(media?.status === 'READY' ? media.url : null);
  if (!media) return null;
  if (media.status === 'PENDING') {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        Downloading attachment…
      </div>
    );
  }
  if (media.status === 'FAILED' || failed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <ImageOff className="size-3.5" aria-hidden="true" />
        Attachment unavailable{message.errorMessage ? `: ${message.errorMessage}` : ''}
      </div>
    );
  }
  if (!url) return <div className="h-32 w-48 animate-pulse rounded-md bg-black/5" />;

  switch (message.type) {
    case 'IMAGE':
    case 'STICKER':
      return (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from an authorized fetch */}
          <img
            src={url}
            alt={media.fileName ?? 'Image'}
            className={cn(
              'max-h-72 rounded-md object-contain',
              message.type === 'STICKER' ? 'w-32' : 'max-w-full',
            )}
          />
        </a>
      );
    case 'VIDEO':
      return <video src={url} controls className="max-h-72 max-w-full rounded-md" />;
    case 'AUDIO':
      return <audio src={url} controls className="w-64 max-w-full" />;
    default:
      return (
        <a
          href={url}
          download={media.fileName ?? 'attachment'}
          className="flex items-center gap-2 rounded-md border bg-white/70 px-2.5 py-2 text-xs hover:bg-white"
        >
          <FileText className="size-5 shrink-0 text-neutral-500" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{media.fileName ?? 'Document'}</span>
            <span className="text-muted-foreground">{formatBytes(media.sizeBytes)}</span>
          </span>
        </a>
      );
  }
}

type LocationPayload = {
  latitude: number | null;
  longitude: number | null;
  name: string | null;
  address: string | null;
};
type ContactsPayload = { contacts: { name: string; phones: string[] }[] };

function StructuredContent({ message }: { message: WhatsAppMessageView }) {
  const payload = (message.payload ?? {}) as Record<string, unknown>;
  if (message.type === 'LOCATION') {
    const location = payload as unknown as LocationPayload;
    const hasCoords = location.latitude !== null && location.longitude !== null;
    return (
      <div className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">{location.name ?? 'Shared location'}</p>
          {location.address ? (
            <p className="text-muted-foreground text-xs">{location.address}</p>
          ) : null}
          {hasCoords ? (
            <a
              className="text-xs text-sky-700 underline"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            >
              Open in maps
            </a>
          ) : null}
        </div>
      </div>
    );
  }
  if (message.type === 'CONTACTS') {
    const { contacts } = payload as unknown as ContactsPayload;
    return (
      <div className="grid gap-1.5">
        {(contacts ?? []).map((contact, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <Contact className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden="true" />
            <div>
              <p className="font-medium">{contact.name || 'Contact'}</p>
              <p className="text-muted-foreground text-xs">{contact.phones.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (message.type === 'UNSUPPORTED') {
    return (
      <p className="text-muted-foreground text-xs italic">
        Unsupported message type
        {typeof payload.providerType === 'string' ? ` (${payload.providerType})` : ''}. Open
        WhatsApp to view it.
      </p>
    );
  }
  return null;
}

function StatusIcon({ status }: { status: WhatsAppMessageView['status'] }) {
  const label = MESSAGE_STATUS_LABEL[status];
  switch (status) {
    case 'QUEUED':
    case 'SENDING':
      return <Clock className="size-3.5" aria-label={label} />;
    case 'SENT':
      return <Check className="size-3.5" aria-label={label} />;
    case 'DELIVERED':
      return <CheckCheck className="size-3.5" aria-label={label} />;
    case 'READ':
      return <CheckCheck className="size-3.5 text-sky-500" aria-label={label} />;
    case 'FAILED':
      return <AlertCircle className="size-3.5 text-red-600" aria-label={label} />;
    default:
      return null;
  }
}

export function WhatsAppMessageBubble({
  message,
  onRetry,
}: {
  message: WhatsAppMessageView;
  onRetry?: (message: WhatsAppMessageView) => void;
}) {
  const outbound = message.direction === 'OUTBOUND';
  const hasMedia = message.media !== null;
  const structured = ['LOCATION', 'CONTACTS', 'UNSUPPORTED'].includes(message.type);
  const showBody = message.body.trim().length > 0 && message.type !== 'LOCATION';

  if (message.type === 'REACTION') {
    return (
      <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
        <span className="text-muted-foreground rounded-full border bg-white px-2 py-0.5 text-xs">
          Reacted {message.body || '—'} · {formatTime(message.createdAt)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'grid max-w-[78%] gap-1.5 rounded-xl px-3 py-2 text-sm shadow-xs',
          outbound
            ? 'rounded-br-sm bg-emerald-50 ring-1 ring-emerald-100'
            : 'rounded-bl-sm bg-white ring-1 ring-neutral-200',
          message.status === 'FAILED' && 'ring-red-200',
        )}
      >
        {message.templateName ? (
          <span className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
            Template · {message.templateName}
          </span>
        ) : null}
        {hasMedia ? <MediaContent message={message} /> : null}
        {structured ? <StructuredContent message={message} /> : null}
        {showBody ? <p className="break-words whitespace-pre-wrap">{message.body}</p> : null}
        {message.type === 'INTERACTIVE' || message.type === 'BUTTON' ? (
          <span className="text-muted-foreground text-[11px]">Button reply</span>
        ) : null}
        <div className="text-muted-foreground flex items-center justify-end gap-1.5 text-[11px]">
          {outbound && message.sentBy ? (
            <span className="truncate">{message.sentBy.name} ·</span>
          ) : null}
          <span>{formatTime(message.createdAt)}</span>
          {outbound ? <StatusIcon status={message.status} /> : null}
        </div>
        {message.status === 'FAILED' ? (
          <div className="flex items-center justify-between gap-2 border-t border-red-100 pt-1.5 text-xs text-red-700">
            <span className="min-w-0">{message.errorMessage ?? 'Not delivered.'}</span>
            {onRetry && !message.sentAt ? (
              <button
                type="button"
                className="flex shrink-0 items-center gap-1 font-medium hover:underline"
                onClick={() => onRetry(message)}
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WhatsAppTimelineEventRow({ event }: { event: WhatsAppTimelineEvent }) {
  if (event.type === 'NOTE_ADDED') {
    return (
      <div className="flex justify-center">
        <div className="grid w-full max-w-[85%] gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
            <StickyNote className="size-3.5" aria-hidden="true" />
            Internal note · {event.actor?.name ?? 'Staff'} · {formatTime(event.createdAt)}
          </span>
          <p className="break-words whitespace-pre-wrap text-amber-950">{event.body}</p>
        </div>
      </div>
    );
  }
  const metadata = (event.metadata ?? {}) as {
    to?: string | { name?: string } | null;
    from?: string | { name?: string } | null;
    reason?: string;
    status?: string;
  };
  const describe = (value: typeof metadata.to) =>
    typeof value === 'string' ? value : (value?.name ?? 'Unassigned');
  let text: string;
  switch (event.type) {
    case 'ASSIGNED':
      text = `Assigned to ${describe(metadata.to)}`;
      break;
    case 'STATUS_CHANGED':
      text = `Status changed to ${typeof metadata.to === 'string' ? metadata.to.toLowerCase() : 'updated'}`;
      break;
    default:
      text =
        typeof metadata.to === 'string'
          ? `WhatsApp consent set to ${metadata.to === 'OPTED_IN' ? 'opted in' : metadata.to === 'OPTED_OUT' ? 'opted out' : 'unknown'}`
          : (event.body ?? 'Contact updated');
  }
  return (
    <div className="text-muted-foreground flex justify-center text-[11px]">
      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5">
        {text}
        {event.actor ? ` by ${event.actor.name}` : ''} · {formatTime(event.createdAt)}
      </span>
    </div>
  );
}
