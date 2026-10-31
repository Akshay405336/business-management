'use client';

import type {
  WhatsAppChannelSummary,
  WhatsAppConversationSummary,
  WhatsAppFolderCounts,
  WhatsAppInboxFolder,
} from '@techwin/contracts';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';
import { CONVERSATION_STATUS_META, formatRelativeTime, initialsOf } from '../utils/whatsapp-format';

const FOLDERS: readonly { id: WhatsAppInboxFolder; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'open', label: 'Open' },
  { id: 'mine', label: 'Assigned to me' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'spam', label: 'Spam' },
];

export function WhatsAppConversationList({
  folder,
  counts,
  search,
  channelId,
  channels,
  items,
  loading,
  hasMore,
  selectedId,
  onFolderChange,
  onSearchChange,
  onChannelChange,
  onSelect,
  onLoadMore,
}: {
  folder: WhatsAppInboxFolder;
  counts: WhatsAppFolderCounts | null;
  search: string;
  channelId: string;
  channels: readonly WhatsAppChannelSummary[];
  items: readonly WhatsAppConversationSummary[];
  loading: boolean;
  hasMore: boolean;
  selectedId: string | null;
  onFolderChange: (folder: WhatsAppInboxFolder) => void;
  onSearchChange: (search: string) => void;
  onChannelChange: (channelId: string) => void;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-r bg-white">
      <div className="grid gap-2 border-b p-3">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, phone or message"
            className="h-9 pl-8"
            aria-label="Search conversations"
          />
        </div>
        {channels.length > 1 ? (
          <Select value={channelId} onValueChange={onChannelChange}>
            <SelectTrigger className="h-8 text-xs" aria-label="Channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Folders">
          {FOLDERS.map((entry) => {
            const count = counts?.[entry.id] ?? 0;
            const active = folder === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onFolderChange(entry.id)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'text-muted-foreground hover:bg-neutral-50',
                )}
              >
                {entry.label}
                {count > 0 ? (
                  <span
                    className={cn('tabular-nums', active ? 'text-emerald-50' : 'text-foreground')}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="grid gap-3 p-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No conversations in this folder.
          </p>
        ) : null}
        <ul>
          {items.map((conversation) => {
            const status = CONVERSATION_STATUS_META[conversation.status];
            const selected = conversation.id === selectedId;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    'flex w-full gap-3 border-b px-3 py-2.5 text-left transition-colors',
                    selected ? 'bg-emerald-50' : 'hover:bg-neutral-50',
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                    {initialsOf(conversation.contact.displayName)}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          conversation.unreadCount > 0 && 'font-semibold',
                        )}
                      >
                        {conversation.contact.displayName}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-[11px]">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                        {conversation.lastMessageDirection === 'OUTBOUND' ? 'You: ' : ''}
                        {conversation.lastMessagePreview || '—'}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="grid min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Badge
                        variant="outline"
                        className={cn('h-4 px-1.5 text-[10px]', status.className)}
                      >
                        {status.label}
                      </Badge>
                      <span className="text-muted-foreground truncate">
                        {conversation.assignee ? conversation.assignee.displayName : 'Unassigned'}
                      </span>
                      {channels.length > 1 ? (
                        <span className="text-muted-foreground ml-auto truncate">
                          {conversation.channelName}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {hasMore ? (
          <div className="p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loading}
              onClick={onLoadMore}
            >
              {loading ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
