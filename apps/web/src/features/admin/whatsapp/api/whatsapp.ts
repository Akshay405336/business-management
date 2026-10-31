import {
  WHATSAPP_ROUTES,
  type WhatsAppAnalyticsResponse,
  type WhatsAppAssigneesResponse,
  type WhatsAppBroadcastAudiencePreview,
  type WhatsAppBroadcastDetail,
  type WhatsAppBroadcastListResponse,
  type WhatsAppChannelListResponse,
  type WhatsAppChannelSummary,
  type WhatsAppChannelTestResult,
  type WhatsAppConversationDetail,
  type WhatsAppConversationListResponse,
  type WhatsAppFolderCounts,
  type WhatsAppMessageView,
  type WhatsAppRealtimeResponse,
  type WhatsAppSendMessageResponse,
  type WhatsAppSetupInfo,
  type WhatsAppTemplateListResponse,
  type WhatsAppTemplateSummary,
  type WhatsAppTemplateSyncResponse,
  type WhatsAppTimelineResponse,
} from '@techwin/contracts';
import type {
  WhatsAppAnalyticsQuery,
  WhatsAppAssignRequest,
  WhatsAppBroadcastAudiencePreviewRequest,
  WhatsAppConsentRequest,
  WhatsAppConversationListQuery,
  WhatsAppConversationStatusRequest,
  WhatsAppCreateBroadcastRequest,
  WhatsAppCreateChannelRequest,
  WhatsAppCreateTemplateRequest,
  WhatsAppCrmLinkRequest,
  WhatsAppEmbeddedSignupRequest,
  WhatsAppRotateCredentialsRequest,
  WhatsAppSendTemplateRequest,
  WhatsAppStartConversationRequest,
  WhatsAppTemplateListQuery,
} from '@techwin/validation';
import { buildQueryString } from '@/features/admin/crm/utils/query-string';
import { accessTokenStore, apiRequest, refreshAccessToken } from '@/shared/api/api-client';
import { apiConfig } from '@/shared/api/api-config';
import { ApiError } from '@/shared/api/api-error';
import { readCookie } from '@/shared/lib/cookies';

// Channels

export const fetchWhatsAppSetup = (signal?: AbortSignal) =>
  apiRequest<WhatsAppSetupInfo>(WHATSAPP_ROUTES.setup, { auth: true, signal });

export const listWhatsAppChannels = (signal?: AbortSignal) =>
  apiRequest<WhatsAppChannelListResponse>(WHATSAPP_ROUTES.channels, { auth: true, signal });

export const createWhatsAppChannel = (body: WhatsAppCreateChannelRequest) =>
  apiRequest<WhatsAppChannelTestResult>(WHATSAPP_ROUTES.channels, {
    method: 'POST',
    auth: true,
    body,
  });

export const completeEmbeddedSignup = (body: WhatsAppEmbeddedSignupRequest) =>
  apiRequest<WhatsAppChannelTestResult>(WHATSAPP_ROUTES.embeddedSignup, {
    method: 'POST',
    auth: true,
    body,
  });

export const renameWhatsAppChannel = (id: string, name: string) =>
  apiRequest<WhatsAppChannelSummary>(WHATSAPP_ROUTES.channel(id), {
    method: 'PATCH',
    auth: true,
    body: { name },
  });

export const testWhatsAppChannel = (id: string) =>
  apiRequest<WhatsAppChannelTestResult>(WHATSAPP_ROUTES.channelTest(id), {
    method: 'POST',
    auth: true,
  });

export const rotateWhatsAppCredentials = (id: string, body: WhatsAppRotateCredentialsRequest) =>
  apiRequest<WhatsAppChannelTestResult>(WHATSAPP_ROUTES.channelCredentials(id), {
    method: 'POST',
    auth: true,
    body,
  });

export const disconnectWhatsAppChannel = (id: string) =>
  apiRequest<WhatsAppChannelSummary>(WHATSAPP_ROUTES.channelDisconnect(id), {
    method: 'POST',
    auth: true,
  });

export const deleteWhatsAppChannel = (id: string) =>
  apiRequest<void>(WHATSAPP_ROUTES.channel(id), { method: 'DELETE', auth: true });

export const syncWhatsAppTemplates = (channelId: string) =>
  apiRequest<WhatsAppTemplateSyncResponse>(WHATSAPP_ROUTES.channelSyncTemplates(channelId), {
    method: 'POST',
    auth: true,
  });

// Inbox

export const listWhatsAppConversations = (
  query: Partial<WhatsAppConversationListQuery>,
  signal?: AbortSignal,
) =>
  apiRequest<WhatsAppConversationListResponse>(
    `${WHATSAPP_ROUTES.conversations}${buildQueryString(query)}`,
    {
      auth: true,
      signal,
    },
  );

export const fetchWhatsAppFolderCounts = (signal?: AbortSignal) =>
  apiRequest<WhatsAppFolderCounts>(WHATSAPP_ROUTES.conversationCounts, { auth: true, signal });

export const fetchWhatsAppConversation = (id: string, signal?: AbortSignal) =>
  apiRequest<WhatsAppConversationDetail>(WHATSAPP_ROUTES.conversation(id), { auth: true, signal });

export const fetchWhatsAppTimeline = (id: string, before?: string, signal?: AbortSignal) =>
  apiRequest<WhatsAppTimelineResponse>(
    `${WHATSAPP_ROUTES.conversationTimeline(id)}${buildQueryString({ before, limit: 50 })}`,
    { auth: true, signal },
  );

export const startWhatsAppConversation = (body: WhatsAppStartConversationRequest) =>
  apiRequest<WhatsAppConversationDetail>(WHATSAPP_ROUTES.conversations, {
    method: 'POST',
    auth: true,
    body,
  });

export const sendWhatsAppText = (conversationId: string, body: string, idempotencyKey: string) =>
  apiRequest<WhatsAppSendMessageResponse>(WHATSAPP_ROUTES.conversationMessages(conversationId), {
    method: 'POST',
    auth: true,
    body: { body, idempotencyKey },
  });

export const sendWhatsAppTemplate = (conversationId: string, body: WhatsAppSendTemplateRequest) =>
  apiRequest<WhatsAppSendMessageResponse>(
    WHATSAPP_ROUTES.conversationTemplateMessages(conversationId),
    {
      method: 'POST',
      auth: true,
      body,
    },
  );

export const addWhatsAppNote = (conversationId: string, body: string) =>
  apiRequest<void>(WHATSAPP_ROUTES.conversationNotes(conversationId), {
    method: 'POST',
    auth: true,
    body: { body },
  });

export const assignWhatsAppConversation = (conversationId: string, body: WhatsAppAssignRequest) =>
  apiRequest<WhatsAppConversationDetail>(WHATSAPP_ROUTES.conversationAssignment(conversationId), {
    method: 'PATCH',
    auth: true,
    body,
  });

export const setWhatsAppConversationStatus = (
  conversationId: string,
  body: WhatsAppConversationStatusRequest,
) =>
  apiRequest<WhatsAppConversationDetail>(WHATSAPP_ROUTES.conversationStatus(conversationId), {
    method: 'PATCH',
    auth: true,
    body,
  });

export const markWhatsAppConversationRead = (conversationId: string) =>
  apiRequest<void>(WHATSAPP_ROUTES.conversationRead(conversationId), {
    method: 'POST',
    auth: true,
  });

export const retryWhatsAppMessage = (messageId: string) =>
  apiRequest<WhatsAppMessageView>(WHATSAPP_ROUTES.messageRetry(messageId), {
    method: 'POST',
    auth: true,
  });

export const setWhatsAppConsent = (contactId: string, body: WhatsAppConsentRequest) =>
  apiRequest<void>(WHATSAPP_ROUTES.contactConsent(contactId), {
    method: 'PATCH',
    auth: true,
    body,
  });

export const setWhatsAppCrmLink = (contactId: string, body: WhatsAppCrmLinkRequest) =>
  apiRequest<void>(WHATSAPP_ROUTES.contactCrmLink(contactId), {
    method: 'PATCH',
    auth: true,
    body,
  });

export const fetchWhatsAppAssignees = (signal?: AbortSignal) =>
  apiRequest<WhatsAppAssigneesResponse>(WHATSAPP_ROUTES.assignees, { auth: true, signal });

export const pollWhatsAppEvents = (after: string | null, waitMs: number, signal?: AbortSignal) =>
  apiRequest<WhatsAppRealtimeResponse>(
    `${WHATSAPP_ROUTES.realtimeEvents}${buildQueryString({ after: after ?? undefined, waitMs })}`,
    { auth: true, signal },
  );

// Templates & broadcasts

export const listWhatsAppTemplates = (
  query: Partial<WhatsAppTemplateListQuery>,
  signal?: AbortSignal,
) =>
  apiRequest<WhatsAppTemplateListResponse>(
    `${WHATSAPP_ROUTES.templates}${buildQueryString(query)}`,
    {
      auth: true,
      signal,
    },
  );

export const submitWhatsAppTemplate = (body: WhatsAppCreateTemplateRequest) =>
  apiRequest<WhatsAppTemplateSummary>(WHATSAPP_ROUTES.templates, {
    method: 'POST',
    auth: true,
    body,
  });

export const listWhatsAppBroadcasts = (signal?: AbortSignal) =>
  apiRequest<WhatsAppBroadcastListResponse>(WHATSAPP_ROUTES.broadcasts, { auth: true, signal });

export const fetchWhatsAppBroadcast = (id: string, signal?: AbortSignal) =>
  apiRequest<WhatsAppBroadcastDetail>(WHATSAPP_ROUTES.broadcast(id), { auth: true, signal });

export const previewWhatsAppAudience = (body: WhatsAppBroadcastAudiencePreviewRequest) =>
  apiRequest<WhatsAppBroadcastAudiencePreview>(WHATSAPP_ROUTES.broadcastAudiencePreview, {
    method: 'POST',
    auth: true,
    body,
  });

export const createWhatsAppBroadcast = (body: WhatsAppCreateBroadcastRequest) =>
  apiRequest<WhatsAppBroadcastDetail>(WHATSAPP_ROUTES.broadcasts, {
    method: 'POST',
    auth: true,
    body,
  });

export const cancelWhatsAppBroadcast = (id: string) =>
  apiRequest<WhatsAppBroadcastDetail>(WHATSAPP_ROUTES.broadcastCancel(id), {
    method: 'POST',
    auth: true,
  });

export const fetchWhatsAppAnalytics = (
  query: Partial<WhatsAppAnalyticsQuery>,
  signal?: AbortSignal,
) =>
  apiRequest<WhatsAppAnalyticsResponse>(`${WHATSAPP_ROUTES.analytics}${buildQueryString(query)}`, {
    auth: true,
    signal,
  });

// Requests that cannot go through the JSON client

const UPLOAD_TIMEOUT_MS = 120_000;

function authorizedHeaders(): Headers {
  const headers = new Headers({ Accept: 'application/json' });
  const token = accessTokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = readCookie(apiConfig.csrfCookie);
  if (csrf) headers.set(apiConfig.csrfHeader, csrf);
  return headers;
}

async function authorizedFetch(
  path: string,
  init: Omit<RequestInit, 'headers'>,
): Promise<Response> {
  if (!accessTokenStore.get()) await refreshAccessToken();
  const run = () =>
    fetch(`${apiConfig.baseUrl}${path}`, {
      ...init,
      headers: authorizedHeaders(),
      credentials: 'include',
    });
  let response = await run();
  if (response.status === 401 && (await refreshAccessToken()) === 'refreshed')
    response = await run();
  return response;
}

/** Multipart upload; the bearer token stays in memory and is never put in a URL. */
export async function sendWhatsAppMedia(
  conversationId: string,
  file: File,
  caption: string,
  idempotencyKey: string,
): Promise<WhatsAppSendMessageResponse> {
  const form = new FormData();
  form.append('file', file);
  if (caption.trim()) form.append('caption', caption.trim());
  form.append('idempotencyKey', idempotencyKey);
  const response = await authorizedFetch(
    WHATSAPP_ROUTES.conversationMediaMessages(conversationId),
    {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw await ApiError.fromResponse(response);
  return (await response.json()) as WhatsAppSendMessageResponse;
}

interface CachedMedia {
  readonly url: Promise<string>;
  readonly expiresAt: number;
}

const mediaCache = new Map<string, CachedMedia>();
const MAX_MEDIA_CACHE = 64;
/** Presigned storage URLs live for at least 60 seconds server-side. */
const SIGNED_URL_REUSE_MS = 50_000;

function evictMedia(path: string): void {
  const entry = mediaCache.get(path);
  mediaCache.delete(path);
  void entry?.url
    .then((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    })
    .catch(() => undefined);
}

/**
 * Resolves conversation media to a URL usable in `src`/`href`: a short-lived storage URL
 * or a blob URL. The bearer token is only ever sent as a header.
 */
export function loadWhatsAppMediaUrl(path: string): Promise<string> {
  const cached = mediaCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) evictMedia(path);

  const url = (async () => {
    const response = await authorizedFetch(path, { method: 'GET' });
    if (!response.ok) throw new Error('Media unavailable.');
    if ((response.headers.get('Content-Type') ?? '').includes('application/json')) {
      const body = (await response.json()) as { url?: unknown };
      if (typeof body.url !== 'string') throw new Error('Media unavailable.');
      mediaCache.set(path, {
        url: Promise.resolve(body.url),
        expiresAt: Date.now() + SIGNED_URL_REUSE_MS,
      });
      return body.url;
    }
    return URL.createObjectURL(await response.blob());
  })();
  url.catch(() => mediaCache.delete(path));
  mediaCache.set(path, { url, expiresAt: Number.POSITIVE_INFINITY });
  while (mediaCache.size > MAX_MEDIA_CACHE) {
    const oldest = mediaCache.keys().next().value;
    if (!oldest) break;
    evictMedia(oldest);
  }
  return url;
}
