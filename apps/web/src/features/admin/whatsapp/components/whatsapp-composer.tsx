'use client';

import type { WhatsAppConversationSummary } from '@techwin/contracts';
import {
  Clock,
  FileText,
  LayoutTemplate,
  Paperclip,
  Send,
  Smile,
  StickyNote,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { formatBytes } from '../utils/whatsapp-format';

const EMOJIS = [
  '😀',
  '😁',
  '😂',
  '🙂',
  '😊',
  '😍',
  '😘',
  '😎',
  '🤔',
  '😅',
  '😉',
  '🙏',
  '👍',
  '👎',
  '👌',
  '👏',
  '🙌',
  '💪',
  '🤝',
  '👋',
  '✅',
  '❌',
  '⚠️',
  '❗',
  '🎉',
  '🔥',
  '⭐',
  '💯',
  '❤️',
  '💙',
  '💚',
  '📞',
  '📧',
  '📅',
  '⏰',
  '📍',
  '📄',
  '📎',
  '💰',
  '🚚',
  '🏠',
  '🛠️',
  '💡',
  '😢',
  '😡',
  '🤗',
  '🥳',
  '😴',
];

export const WHATSAPP_ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/3gpp',
  'audio/aac',
  'audio/amr',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

function windowRemaining(endsAt: string | null, now: number): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function WhatsAppComposer({
  conversation,
  canReply,
  onSendText,
  onSendMedia,
  onAddNote,
  onOpenTemplates,
}: {
  conversation: WhatsAppConversationSummary;
  canReply: boolean;
  onSendText: (body: string) => Promise<void>;
  onSendMedia: (file: File, caption: string) => Promise<void>;
  onAddNote: (body: string) => Promise<void>;
  onOpenTemplates: () => void;
}) {
  const [modeChoice, setMode] = useState<'reply' | 'note'>('reply');
  const mode = canReply ? modeChoice : 'note';
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const remaining = windowRemaining(conversation.serviceWindowEndsAt, now);
  const windowOpen = remaining !== null;
  const replyBlocked = mode === 'reply' && (!canReply || !windowOpen);

  const submit = async () => {
    if (sending) return;
    const body = text.trim();
    if (mode === 'note') {
      if (!body) return;
    } else if (replyBlocked || (!body && !file)) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      if (mode === 'note') await onAddNote(body);
      else if (file) await onSendMedia(file, body);
      else await onSendText(body);
      setText('');
      setFile(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not send.');
    } finally {
      setSending(false);
      textarea.current?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  const insertEmoji = (emoji: string) => {
    const element = textarea.current;
    if (!element) return setText((current) => current + emoji);
    const start = element.selectionStart;
    const end = element.selectionEnd;
    setText((current) => current.slice(0, start) + emoji + current.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return (
    <div className="grid gap-2 border-t bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted inline-flex rounded-md p-0.5 text-xs">
          <button
            type="button"
            disabled={!canReply}
            onClick={() => setMode('reply')}
            className={cn(
              'rounded px-2.5 py-1 font-medium',
              mode === 'reply' ? 'bg-white shadow-xs' : 'text-muted-foreground',
            )}
          >
            Reply
          </button>
          <button
            type="button"
            onClick={() => setMode('note')}
            className={cn(
              'flex items-center gap-1 rounded px-2.5 py-1 font-medium',
              mode === 'note' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-muted-foreground',
            )}
          >
            <StickyNote className="size-3" aria-hidden="true" />
            Internal note
          </button>
        </div>
        {mode === 'reply' ? (
          <span
            className={cn(
              'flex items-center gap-1 text-xs',
              windowOpen ? 'text-muted-foreground' : 'font-medium text-amber-700',
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {windowOpen
              ? `Customer service window closes in ${remaining}`
              : 'The 24-hour window is closed. Only approved templates can be sent.'}
          </span>
        ) : (
          <span className="text-xs text-amber-700">
            Visible to your team only. Never sent to WhatsApp.
          </span>
        )}
      </div>

      {file ? (
        <div className="flex items-center gap-2 rounded-md border bg-neutral-50 px-2.5 py-1.5 text-xs">
          <FileText className="size-4 text-neutral-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
          <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)}>
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'flex items-end gap-2 rounded-lg border p-1.5',
          mode === 'note' && 'border-amber-200 bg-amber-50/60',
        )}
      >
        {mode === 'reply' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach file"
              disabled={replyBlocked}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip aria-hidden="true" />
            </Button>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept={WHATSAPP_ATTACHMENT_ACCEPT}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
          </>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Insert emoji"
              disabled={replyBlocked}
            >
              <Smile aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="grid w-72 grid-cols-8 gap-0.5 p-1.5">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded p-1 text-lg hover:bg-neutral-100"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Textarea
          ref={textarea}
          rows={2}
          value={text}
          disabled={replyBlocked}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={mode === 'note' ? 4000 : file ? 1024 : 4096}
          placeholder={
            mode === 'note'
              ? 'Write an internal note…'
              : replyBlocked
                ? 'Send an approved template to restart the conversation'
                : file
                  ? 'Add a caption (optional)'
                  : 'Type a message…  (Enter to send, Shift+Enter for a new line)'
          }
          className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        {mode === 'reply' && canReply ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenTemplates}
            className="shrink-0"
          >
            <LayoutTemplate aria-hidden="true" />
            Template
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={cn('shrink-0', mode === 'note' && 'bg-amber-600 hover:bg-amber-700')}
          disabled={
            sending || (mode === 'reply' ? replyBlocked || (!text.trim() && !file) : !text.trim())
          }
          onClick={() => void submit()}
        >
          <Send aria-hidden="true" />
          {mode === 'note' ? 'Add note' : 'Send'}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
