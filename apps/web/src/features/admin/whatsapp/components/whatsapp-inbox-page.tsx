'use client';

import type {
  WhatsAppAssigneeSummary,
  WhatsAppChannelSummary,
  WhatsAppConversationDetail,
  WhatsAppConversationSummary,
  WhatsAppFolderCounts,
  WhatsAppInboxFolder,
  WhatsAppMessageView,
  WhatsAppRealtimeEvent,
  WhatsAppTimelineItem,
} from '@techwin/contracts';
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquarePlus,
  MoreVertical,
  PanelRight,
  RotateCcw,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import {
  addWhatsAppNote,
  assignWhatsAppConversation,
  fetchWhatsAppAssignees,
  fetchWhatsAppConversation,
  fetchWhatsAppFolderCounts,
  fetchWhatsAppTimeline,
  listWhatsAppChannels,
  listWhatsAppConversations,
  markWhatsAppConversationRead,
  retryWhatsAppMessage,
  sendWhatsAppMedia,
  sendWhatsAppTemplate,
  sendWhatsAppText,
  setWhatsAppConsent,
  setWhatsAppConversationStatus,
  setWhatsAppCrmLink,
} from '../api/whatsapp';
import { useWhatsAppRealtime } from '../hooks/use-whatsapp-realtime';
import {
  CONVERSATION_STATUS_META,
  describeWhatsAppError,
  formatDayLabel,
  initialsOf,
  newIdempotencyKey,
} from '../utils/whatsapp-format';
import { WhatsAppComposer } from './whatsapp-composer';
import { WhatsAppContactPanel } from './whatsapp-contact-panel';
import { WhatsAppConversationList } from './whatsapp-conversation-list';
import { WhatsAppMessageBubble, WhatsAppTimelineEventRow } from './whatsapp-message-bubble';
import { WhatsAppPageShell } from './whatsapp-page-shell';
import { StartConversationDialog } from './whatsapp-start-conversation-dialog';
import { TemplateSendDialog } from './whatsapp-template-dialog';

const itemKey = (item: WhatsAppTimelineItem) =>
  item.kind === 'message' ? `m:${item.message.id}` : `e:${item.event.id}`;

function mergeTimeline(
  current: readonly WhatsAppTimelineItem[],
  incoming: readonly WhatsAppTimelineItem[],
): WhatsAppTimelineItem[] {
  const map = new Map(current.map((item) => [itemKey(item), item]));
  for (const item of incoming) map.set(itemKey(item), item);
  return [...map.values()].sort((a, b) => a.at.localeCompare(b.at));
}

const messageItem = (message: WhatsAppMessageView): WhatsAppTimelineItem => ({
  kind: 'message',
  at: message.createdAt,
  message,
});

/** Rethrows with a user-facing message so the composer can show it inline. */
async function withMessage<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    throw new Error(describeWhatsAppError(error));
  }
}

export function WhatsAppInboxPage() {
  const toast = useAdminToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [folder, setFolder] = useState<WhatsAppInboxFolder>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [items, setItems] = useState<WhatsAppConversationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadedListKey, setLoadedListKey] = useState<string | null>(null);
  const [appending, setAppending] = useState(false);
  const [counts, setCounts] = useState<WhatsAppFolderCounts | null>(null);
  const [channels, setChannels] = useState<readonly WhatsAppChannelSummary[]>([]);
  const [assignees, setAssignees] = useState<readonly WhatsAppAssigneeSummary[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    searchParams.get('conversation'),
  );
  const [detail, setDetail] = useState<WhatsAppConversationDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<WhatsAppTimelineItem[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [olderLoading, setOlderLoading] = useState(false);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  const listRequest = useRef(0);
  const selectedRef = useRef<string | null>(selectedId);
  const draftKey = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const listTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listKey = `${folder}|${debouncedSearch}|${channelFilter}`;
  const listLoading = loadedListKey !== listKey || appending;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /** Reloads the first page, or appends the page after `cursor`. */
  const loadList = useCallback(
    (cursor: string | null = null) => {
      const requestId = ++listRequest.current;
      const key = `${folder}|${debouncedSearch}|${channelFilter}`;
      return listWhatsAppConversations({
        folder,
        search: debouncedSearch || undefined,
        channelId: channelFilter === 'all' ? undefined : channelFilter,
        cursor: cursor ?? undefined,
        limit: 30,
      })
        .then((response) => {
          if (requestId !== listRequest.current) return;
          setItems((current) => {
            if (!cursor) return [...response.items];
            const seen = new Set(current.map((item) => item.id));
            return [...current, ...response.items.filter((item) => !seen.has(item.id))];
          });
          setNextCursor(response.nextCursor);
        })
        .catch((error: unknown) => {
          if (requestId === listRequest.current)
            toast.error(describeWhatsAppError(error, 'Could not load conversations.'));
        })
        .finally(() => {
          if (requestId !== listRequest.current) return;
          setLoadedListKey(key);
          setAppending(false);
        });
    },
    [folder, debouncedSearch, channelFilter, toast],
  );

  const loadCounts = useCallback(() => {
    fetchWhatsAppFolderCounts()
      .then(setCounts)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    loadCounts();
    listWhatsAppChannels()
      .then((response) => setChannels(response.channels))
      .catch(() => undefined);
    fetchWhatsAppAssignees()
      .then((response) => {
        setAssignees(response.assignees);
        setCurrentEmployeeId(response.currentEmployeeId);
      })
      .catch(() => undefined);
  }, [loadCounts]);

  const refreshListSoon = useCallback(() => {
    if (listTimer.current) clearTimeout(listTimer.current);
    listTimer.current = setTimeout(() => {
      void loadList();
      loadCounts();
    }, 500);
  }, [loadList, loadCounts]);

  const patchListItem = useCallback((conversation: WhatsAppConversationSummary) => {
    setItems((current) =>
      current.map((item) => (item.id === conversation.id ? conversation : item)),
    );
  }, []);

  const markRead = useCallback(
    (conversation: WhatsAppConversationSummary) => {
      if (conversation.unreadCount === 0) return;
      markWhatsAppConversationRead(conversation.id)
        .then(() => {
          patchListItem({ ...conversation, unreadCount: 0 });
          loadCounts();
        })
        .catch(() => undefined);
    },
    [patchListItem, loadCounts],
  );

  const refreshThread = useCallback(
    async (conversationId: string) => {
      try {
        const [nextDetail, latest] = await Promise.all([
          fetchWhatsAppConversation(conversationId),
          fetchWhatsAppTimeline(conversationId),
        ]);
        if (selectedRef.current !== conversationId) return;
        setDetail(nextDetail);
        setTimeline((current) => mergeTimeline(current, latest.items));
        patchListItem(nextDetail.conversation);
        if (document.visibilityState === 'visible') markRead(nextDetail.conversation);
      } catch {
        // Realtime refreshes are best-effort; the next event or reconnect retries.
      }
    },
    [patchListItem, markRead],
  );

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    Promise.all([
      fetchWhatsAppConversation(selectedId, controller.signal),
      fetchWhatsAppTimeline(selectedId, undefined, controller.signal),
    ])
      .then(([nextDetail, page]) => {
        setDetail(nextDetail);
        setTimeline(mergeTimeline([], page.items));
        setOlderCursor(page.olderCursor);
        markRead(nextDetail.conversation);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setDetailError(describeWhatsAppError(error, 'Could not open this conversation.'));
      });
    return () => controller.abort();
  }, [selectedId, markRead]);

  const select = useCallback(
    (id: string | null) => {
      if (id === selectedRef.current) return;
      selectedRef.current = id;
      setSelectedId(id);
      setDetail(null);
      setDetailError(null);
      setTimeline([]);
      setOlderCursor(null);
      draftKey.current = null;
      stickToBottom.current = true;
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('conversation', id);
      else params.delete('conversation');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const onEvents = useCallback(
    (events: readonly WhatsAppRealtimeEvent[]) => {
      refreshListSoon();
      const current = selectedRef.current;
      if (current && events.some((event) => event.conversationId === current)) {
        if (threadTimer.current) clearTimeout(threadTimer.current);
        threadTimer.current = setTimeout(() => void refreshThread(current), 250);
      }
    },
    [refreshListSoon, refreshThread],
  );

  const onResync = useCallback(() => {
    refreshListSoon();
    if (selectedRef.current) void refreshThread(selectedRef.current);
  }, [refreshListSoon, refreshThread]);

  const realtime = useWhatsAppRealtime({ onEvents, onResync });
  const previousRealtime = useRef(realtime);
  useEffect(() => {
    if (realtime === 'live' && previousRealtime.current !== 'live') onResync();
    previousRealtime.current = realtime;
  }, [realtime, onResync]);

  useEffect(
    () => () => {
      if (listTimer.current) clearTimeout(listTimer.current);
      if (threadTimer.current) clearTimeout(threadTimer.current);
    },
    [],
  );

  useEffect(() => {
    const element = scroller.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [timeline]);

  const loadOlder = async () => {
    if (!selectedId || !olderCursor) return;
    const element = scroller.current;
    const previousHeight = element?.scrollHeight ?? 0;
    setOlderLoading(true);
    try {
      const page = await fetchWhatsAppTimeline(selectedId, olderCursor);
      stickToBottom.current = false;
      setTimeline((current) => mergeTimeline(current, page.items));
      setOlderCursor(page.olderCursor);
      requestAnimationFrame(() => {
        if (element) element.scrollTop = element.scrollHeight - previousHeight;
      });
    } catch (error) {
      toast.error(describeWhatsAppError(error, 'Could not load older messages.'));
    } finally {
      setOlderLoading(false);
    }
  };

  const conversation = detail?.conversation ?? null;

  const applyDetail = (next: WhatsAppConversationDetail) => {
    setDetail(next);
    patchListItem(next.conversation);
    refreshListSoon();
  };

  const appendMessage = (message: WhatsAppMessageView) => {
    stickToBottom.current = true;
    setTimeline((current) => mergeTimeline(current, [messageItem(message)]));
    refreshListSoon();
  };

  const takeDraftKey = () => (draftKey.current ??= newIdempotencyKey());

  const sendText = (body: string) =>
    withMessage(async () => {
      if (!conversation) return;
      const response = await sendWhatsAppText(conversation.id, body, takeDraftKey());
      draftKey.current = null;
      appendMessage(response.message);
    });

  const sendMedia = (file: File, caption: string) =>
    withMessage(async () => {
      if (!conversation) return;
      const response = await sendWhatsAppMedia(conversation.id, file, caption, takeDraftKey());
      draftKey.current = null;
      appendMessage(response.message);
    });

  const sendTemplate = (templateId: string, variables: string[]) =>
    withMessage(async () => {
      if (!conversation) return;
      const response = await sendWhatsAppTemplate(conversation.id, {
        templateId,
        variables,
        idempotencyKey: newIdempotencyKey(),
      });
      appendMessage(response.message);
    });

  const addNote = (body: string) =>
    withMessage(async () => {
      if (!conversation) return;
      await addWhatsAppNote(conversation.id, body);
      stickToBottom.current = true;
      await refreshThread(conversation.id);
    });

  const runAction = async (task: () => Promise<void>, success?: string) => {
    try {
      await task();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(describeWhatsAppError(error));
    }
  };

  const assign = (employeeId: string | null) =>
    runAction(async () => {
      if (!conversation) return;
      applyDetail(await assignWhatsAppConversation(conversation.id, { employeeId }));
      if (selectedRef.current) await refreshThread(selectedRef.current);
    });

  const setStatus = (status: 'OPEN' | 'RESOLVED' | 'SPAM') =>
    runAction(
      async () => {
        if (!conversation) return;
        applyDetail(await setWhatsAppConversationStatus(conversation.id, { status }));
        if (selectedRef.current) await refreshThread(selectedRef.current);
      },
      status === 'RESOLVED'
        ? 'Conversation resolved.'
        : status === 'SPAM'
          ? 'Marked as spam.'
          : 'Conversation reopened.',
    );

  const setConsent = (status: 'OPTED_IN' | 'OPTED_OUT', source: string) =>
    runAction(async () => {
      if (!conversation) return;
      await setWhatsAppConsent(conversation.contact.id, { status, source });
      await refreshThread(conversation.id);
    }, 'Consent updated.');

  const setCrmLink = (kind: 'LEAD' | 'CLIENT', id: string | null) =>
    runAction(
      async () => {
        if (!conversation) return;
        await setWhatsAppCrmLink(conversation.contact.id, { kind, id });
        await refreshThread(conversation.id);
      },
      id ? 'Linked to CRM.' : 'CRM link removed.',
    );

  const retry = (message: WhatsAppMessageView) =>
    void runAction(async () => {
      appendMessage(await retryWhatsAppMessage(message.id));
    });

  const grouped = useMemo(() => {
    const groups: { day: string; items: WhatsAppTimelineItem[] }[] = [];
    for (const item of timeline) {
      const day = new Date(item.at).toDateString();
      const last = groups.at(-1);
      if (last && last.day === day) last.items.push(item);
      else groups.push({ day, items: [item] });
    }
    return groups;
  }, [timeline]);

  const noChannels = channels.length === 0;

  const contactPanel = detail ? (
    <WhatsAppContactPanel
      detail={detail}
      assignees={assignees}
      currentEmployeeId={currentEmployeeId}
      onAssign={assign}
      onConsent={setConsent}
      onCrmLink={setCrmLink}
    />
  ) : null;

  return (
    <WhatsAppPageShell
      title="WhatsApp Inbox"
      description="Customer conversations from your connected WhatsApp Business numbers."
      toolbar={
        <>
          <span
            className={cn(
              'flex items-center gap-1.5 text-xs',
              realtime === 'live' ? 'text-emerald-700' : 'text-amber-700',
            )}
          >
            <span
              className={cn(
                'size-2 rounded-full',
                realtime === 'live' ? 'bg-emerald-500' : 'animate-pulse bg-amber-500',
              )}
            />
            {realtime === 'live'
              ? 'Live'
              : realtime === 'connecting'
                ? 'Connecting…'
                : 'Reconnecting…'}
          </span>
          <Button type="button" size="sm" disabled={noChannels} onClick={() => setStartOpen(true)}>
            <MessageSquarePlus aria-hidden="true" />
            New conversation
          </Button>
        </>
      }
    >
      {noChannels && !listLoading ? (
        <Alert variant="info">
          <AlertDescription>
            No WhatsApp number is connected yet.{' '}
            <Link href="/admin/whatsapp/channels" className="font-medium underline">
              Connect a channel
            </Link>{' '}
            to start receiving messages.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-xl border bg-white lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <div className={cn('min-h-0', selectedId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col')}>
          <WhatsAppConversationList
            folder={folder}
            counts={counts}
            search={search}
            channelId={channelFilter}
            channels={channels}
            items={items}
            loading={listLoading}
            hasMore={nextCursor !== null}
            selectedId={selectedId}
            onFolderChange={setFolder}
            onSearchChange={setSearch}
            onChannelChange={setChannelFilter}
            onSelect={select}
            onLoadMore={() => {
              setAppending(true);
              void loadList(nextCursor);
            }}
          />
        </div>

        <section
          className={cn('min-h-0 flex-col bg-[#f4f1ec]', selectedId ? 'flex' : 'hidden lg:flex')}
        >
          {!selectedId ? (
            <div className="text-muted-foreground grid flex-1 place-items-center p-6 text-center text-sm">
              Select a conversation to start replying.
            </div>
          ) : detailError ? (
            <div className="grid flex-1 place-items-center gap-3 p-6 text-center text-sm">
              <p className="text-red-600">{detailError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => select(null)}>
                Back to conversations
              </Button>
            </div>
          ) : !conversation ? (
            <div className="grid gap-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="ml-auto h-10 w-1/2" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b bg-white px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Back to conversations"
                  onClick={() => select(null)}
                >
                  <ArrowLeft aria-hidden="true" />
                </Button>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                  {initialsOf(conversation.contact.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {conversation.contact.displayName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {conversation.contact.phoneE164} · {conversation.channelName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={CONVERSATION_STATUS_META[conversation.status].className}
                >
                  {CONVERSATION_STATUS_META[conversation.status].label}
                </Badge>
                {!conversation.assignee &&
                currentEmployeeId &&
                (detail?.canAssign || detail?.canReply) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => void assign(currentEmployeeId)}
                  >
                    <UserPlus aria-hidden="true" />
                    Assign to me
                  </Button>
                ) : null}
                {detail?.canReply || detail?.canAssign ? (
                  conversation.status === 'RESOLVED' || conversation.status === 'SPAM' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void setStatus('OPEN')}
                    >
                      <RotateCcw aria-hidden="true" />
                      Reopen
                    </Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => void setStatus('RESOLVED')}>
                      <CheckCircle2 aria-hidden="true" />
                      Resolve
                    </Button>
                  )
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="xl:hidden"
                  aria-label="Contact details"
                  onClick={() => setContactSheetOpen(true)}
                >
                  <PanelRight aria-hidden="true" />
                </Button>
                {(detail?.canReply || detail?.canAssign) && conversation.status !== 'SPAM' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="More actions"
                      >
                        <MoreVertical aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600"
                        onSelect={() => void setStatus('SPAM')}
                      >
                        <ShieldAlert aria-hidden="true" />
                        Mark as spam
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </header>

              <div
                ref={scroller}
                className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
                onScroll={(event) => {
                  const element = event.currentTarget;
                  stickToBottom.current =
                    element.scrollHeight - element.scrollTop - element.clientHeight < 80;
                }}
              >
                {olderCursor ? (
                  <div className="mb-3 flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={olderLoading}
                      onClick={() => void loadOlder()}
                    >
                      Load older messages
                    </Button>
                  </div>
                ) : null}
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground py-10 text-center text-sm">
                    No messages yet.
                  </p>
                ) : null}
                <div className="grid gap-2">
                  {grouped.map((group) => (
                    <Fragment key={group.day}>
                      <div className="my-2 flex justify-center">
                        <span className="rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-medium text-neutral-600 shadow-xs">
                          {formatDayLabel(group.items[0]?.at ?? group.day)}
                        </span>
                      </div>
                      {group.items.map((item) =>
                        item.kind === 'message' ? (
                          <WhatsAppMessageBubble
                            key={itemKey(item)}
                            message={item.message}
                            onRetry={retry}
                          />
                        ) : (
                          <WhatsAppTimelineEventRow key={itemKey(item)} event={item.event} />
                        ),
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>

              {conversation.status === 'SPAM' ? (
                <p className="border-t bg-white p-3 text-center text-xs text-red-700">
                  This conversation is marked as spam. Reopen it to reply.
                </p>
              ) : (
                <WhatsAppComposer
                  key={conversation.id}
                  conversation={conversation}
                  canReply={detail?.canReply ?? false}
                  onSendText={sendText}
                  onSendMedia={sendMedia}
                  onAddNote={addNote}
                  onOpenTemplates={() => setTemplateOpen(true)}
                />
              )}
            </>
          )}
        </section>

        <div className="hidden min-h-0 xl:grid">
          {contactPanel ?? (
            <div className="text-muted-foreground grid place-items-center border-l p-6 text-center text-xs">
              Contact details appear here.
            </div>
          )}
        </div>
      </div>

      <Sheet open={contactSheetOpen} onOpenChange={setContactSheetOpen}>
        <SheetContent side="right" className="w-[320px] p-0">
          <SheetTitle className="sr-only">Contact details</SheetTitle>
          {contactPanel}
        </SheetContent>
      </Sheet>

      {conversation ? (
        <TemplateSendDialog
          open={templateOpen}
          channelId={conversation.channelId}
          onOpenChange={setTemplateOpen}
          onSend={sendTemplate}
        />
      ) : null}

      <StartConversationDialog
        open={startOpen}
        channels={channels}
        onOpenChange={setStartOpen}
        onStarted={(started) => {
          refreshListSoon();
          select(started.conversation.id);
        }}
      />
    </WhatsAppPageShell>
  );
}
