import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../../config/app-config.js';
import { WhatsAppProviderError } from '../../domain/whatsapp.errors.js';
import type {
  ProviderOutboundMessage,
  ProviderPhoneNumberInfo,
  ProviderTemplate,
  ProviderTemplateDraft,
  WhatsAppProviderCredentials,
  WhatsAppProviderPort,
} from '../../domain/whatsapp.ports.js';
import type { TemplateSendParameter } from '../../domain/whatsapp-template.js';

type Json = Record<string, unknown>;

const REQUEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_TEMPLATE_PAGES = 20;

/** Graph API error codes that are worth retrying later. */
const RETRYABLE_CODES = new Set([
  '1',
  '2',
  '4',
  '17',
  '32',
  '613',
  '80007',
  '130429',
  '131000',
  '131016',
]);
/** Token expired, revoked or missing permissions. */
const CREDENTIAL_CODES = new Set(['190', '10', '200', '102']);

const FRIENDLY_MESSAGES: Readonly<Record<string, string>> = {
  '190': 'The access token is invalid or expired. Rotate the channel credentials.',
  '10': 'The access token is missing a required permission (whatsapp_business_messaging).',
  '200': 'The access token is missing a required permission (whatsapp_business_management).',
  '130429': 'Meta throughput limit reached. The message will be retried.',
  '131026':
    'Message undeliverable. The number may not use WhatsApp or has not accepted the latest terms.',
  '131047':
    'More than 24 hours have passed since the customer last replied. Send an approved template instead.',
  '131049': 'Meta did not deliver this marketing message to protect the customer experience.',
  '131050': 'The customer has stopped receiving marketing messages from this business.',
  '131051': 'Unsupported message type.',
  '131052': 'Media could not be downloaded from WhatsApp.',
  '131053': 'Media could not be uploaded to WhatsApp. Check the file type and size.',
  '132000': 'Template parameters do not match the approved template.',
  '132001': 'The template does not exist in this language or is not approved.',
  '132005': 'Template text is too long after variables were filled in.',
  '132007': 'Template content violates WhatsApp policy.',
  '132012': 'Template parameter format does not match the approved template.',
  '132015': 'The template is paused because of low quality.',
  '132016': 'The template has been disabled by Meta.',
  '368': 'The business account is temporarily blocked for policy violations.',
};

/** Hosts Meta uses for media download URLs; tokens are never sent anywhere else. */
const MEDIA_HOST_SUFFIXES = ['.fbsbx.com', '.facebook.com', '.whatsapp.net', '.fbcdn.net'];

function redact(text: string): string {
  return text.replace(/EAA[A-Za-z0-9]{10,}/g, '[redacted]').slice(0, 400);
}

function obj(value: unknown): Json | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}

function textParameter(parameter: TemplateSendParameter): Json {
  return {
    type: 'text',
    text: parameter.value,
    ...(parameter.name ? { parameter_name: parameter.name } : {}),
  };
}

/** Converts neutral template parameters into Graph API `components`. */
function templateComponents(parameters: readonly TemplateSendParameter[]): Json[] {
  const components: Json[] = [];
  const header = parameters.filter((parameter) => parameter.component === 'HEADER');
  const body = parameters.filter((parameter) => parameter.component === 'BODY');
  if (header.length > 0) components.push({ type: 'header', parameters: header.map(textParameter) });
  if (body.length > 0) components.push({ type: 'body', parameters: body.map(textParameter) });
  const byButton = new Map<number, TemplateSendParameter[]>();
  for (const parameter of parameters) {
    if (parameter.component !== 'BUTTON' || parameter.buttonIndex === null) continue;
    byButton.set(parameter.buttonIndex, [
      ...(byButton.get(parameter.buttonIndex) ?? []),
      parameter,
    ]);
  }
  for (const [index, buttonParameters] of byButton) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(index),
      parameters: buttonParameters.map((parameter) => ({ type: 'text', text: parameter.value })),
    });
  }
  return components;
}

/**
 * Adapter for the official Meta WhatsApp Business Cloud API (Graph API).
 * All Meta wire formats live here.
 */
@Injectable()
export class MetaCloudApiProvider implements WhatsAppProviderPort {
  private readonly baseUrl: string;
  private readonly graphHost: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.baseUrl = `${config.whatsapp.graphApiBaseUrl}/${config.whatsapp.graphApiVersion}`;
    this.graphHost = new URL(config.whatsapp.graphApiBaseUrl).host;
  }

  async verifyPhoneNumber(
    credentials: WhatsAppProviderCredentials,
  ): Promise<ProviderPhoneNumberInfo> {
    const numbers = await this.request<Json>(
      `${credentials.businessAccountId}/phone_numbers?fields=id&limit=100`,
      { token: credentials.accessToken },
    );
    const ids = (Array.isArray(numbers.data) ? numbers.data : []).map((item) => str(obj(item)?.id));
    if (!ids.includes(credentials.phoneNumberId)) {
      throw new WhatsAppProviderError(
        'The phone number ID does not belong to this WhatsApp Business Account.',
        null,
        null,
        false,
      );
    }
    const info = await this.request<Json>(
      `${credentials.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
      { token: credentials.accessToken },
    );
    return {
      displayPhoneNumber: str(info.display_phone_number).slice(0, 32),
      verifiedName: str(info.verified_name).slice(0, 160),
      qualityRating: str(info.quality_rating).slice(0, 32) || null,
      messagingLimitTier: str(info.messaging_limit_tier).slice(0, 32) || null,
    };
  }

  async subscribeApp(credentials: WhatsAppProviderCredentials): Promise<void> {
    await this.request(`${credentials.businessAccountId}/subscribed_apps`, {
      token: credentials.accessToken,
      method: 'POST',
    });
  }

  async sendMessage(
    credentials: WhatsAppProviderCredentials,
    toWaId: string,
    message: ProviderOutboundMessage,
  ): Promise<{ providerMessageId: string }> {
    const body: Json = { messaging_product: 'whatsapp', recipient_type: 'individual', to: toWaId };
    switch (message.kind) {
      case 'text':
        body.type = 'text';
        body.text = { body: message.body, preview_url: false };
        break;
      case 'media': {
        const media: Json = { id: message.mediaId };
        if (message.caption && message.mediaType !== 'audio') media.caption = message.caption;
        if (message.fileName && message.mediaType === 'document') media.filename = message.fileName;
        body.type = message.mediaType;
        body[message.mediaType] = media;
        break;
      }
      case 'template': {
        const components = templateComponents(message.parameters);
        body.type = 'template';
        body.template = {
          name: message.name,
          language: { code: message.language },
          ...(components.length > 0 ? { components } : {}),
        };
        break;
      }
    }
    const response = await this.request<Json>(`${credentials.phoneNumberId}/messages`, {
      token: credentials.accessToken,
      method: 'POST',
      json: body,
    });
    const first = obj(Array.isArray(response.messages) ? response.messages[0] : null);
    const providerMessageId = str(first?.id);
    if (!providerMessageId) {
      throw new WhatsAppProviderError(
        'Meta accepted the request without a message id.',
        null,
        null,
        false,
      );
    }
    return { providerMessageId };
  }

  async markRead(
    credentials: WhatsAppProviderCredentials,
    providerMessageId: string,
  ): Promise<void> {
    await this.request(`${credentials.phoneNumberId}/messages`, {
      token: credentials.accessToken,
      method: 'POST',
      json: { messaging_product: 'whatsapp', status: 'read', message_id: providerMessageId },
    });
  }

  async uploadMedia(
    credentials: WhatsAppProviderCredentials,
    file: { buffer: Buffer; mimeType: string; fileName: string },
  ): Promise<{ mediaId: string }> {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('type', file.mimeType);
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
      file.fileName,
    );
    const response = await this.request<Json>(`${credentials.phoneNumberId}/media`, {
      token: credentials.accessToken,
      method: 'POST',
      form,
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
    });
    const mediaId = str(response.id);
    if (!mediaId)
      throw new WhatsAppProviderError('Meta did not return a media id.', null, null, false);
    return { mediaId };
  }

  async downloadMedia(
    credentials: WhatsAppProviderCredentials,
    mediaId: string,
    maxBytes: number,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const meta = await this.request<Json>(
      `${encodeURIComponent(mediaId)}?phone_number_id=${encodeURIComponent(credentials.phoneNumberId)}`,
      { token: credentials.accessToken },
    );
    const declaredSize = Number(meta.file_size);
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new WhatsAppProviderError(
        'Media exceeds the configured size limit.',
        'size_limit',
        null,
        false,
      );
    }
    const url = this.safeMediaUrl(str(meta.url));
    const response = await this.fetchOrThrow(url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok || !response.body) {
      throw new WhatsAppProviderError(
        'Media download failed.',
        String(response.status),
        response.status,
        response.status >= 500,
      );
    }
    const chunks: Buffer[] = [];
    let total = 0;
    const reader = (response.body as unknown as WebReadableStream<Uint8Array>).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new WhatsAppProviderError(
          'Media exceeds the configured size limit.',
          'size_limit',
          null,
          false,
        );
      }
      chunks.push(Buffer.from(value));
    }
    return {
      buffer: Buffer.concat(chunks),
      mimeType:
        str(meta.mime_type) || response.headers.get('content-type') || 'application/octet-stream',
    };
  }

  async listTemplates(
    credentials: WhatsAppProviderCredentials,
  ): Promise<readonly ProviderTemplate[]> {
    const templates: ProviderTemplate[] = [];
    let next: string | null =
      `${this.baseUrl}/${credentials.businessAccountId}/message_templates?fields=id,name,language,status,category,components,rejected_reason,quality_score&limit=100`;
    for (let page = 0; next && page < MAX_TEMPLATE_PAGES; page += 1) {
      const response: Json = await this.request<Json>(next, {
        token: credentials.accessToken,
        absolute: true,
      });
      for (const item of Array.isArray(response.data) ? response.data : []) {
        const row = obj(item);
        if (!row) continue;
        const quality = obj(row.quality_score);
        templates.push({
          id: str(row.id),
          name: str(row.name),
          language: str(row.language),
          category: str(row.category) || 'UNKNOWN',
          status: str(row.status) || 'UNKNOWN',
          rejectedReason:
            str(row.rejected_reason) && str(row.rejected_reason) !== 'NONE'
              ? str(row.rejected_reason)
              : null,
          qualityScore: str(quality?.score) || null,
          components: Array.isArray(row.components) ? row.components : [],
        });
      }
      const nextUrl = str(obj(response.paging)?.next);
      next = nextUrl && new URL(nextUrl).host === this.graphHost ? nextUrl : null;
    }
    return templates.filter((template) => template.id && template.name && template.language);
  }

  async createTemplate(
    credentials: WhatsAppProviderCredentials,
    draft: ProviderTemplateDraft,
  ): Promise<{ id: string; status: string; category: string }> {
    const response = await this.request<Json>(
      `${credentials.businessAccountId}/message_templates`,
      {
        token: credentials.accessToken,
        method: 'POST',
        json: {
          name: draft.name,
          language: draft.language,
          category: draft.category,
          components: draft.components,
        },
      },
    );
    return {
      id: str(response.id),
      status: str(response.status) || 'PENDING',
      category: str(response.category) || draft.category,
    };
  }

  async exchangeEmbeddedSignupCode(code: string): Promise<{ accessToken: string }> {
    const { metaAppId, metaAppSecret } = this.config.whatsapp;
    if (!metaAppId || !metaAppSecret) {
      throw new WhatsAppProviderError(
        'Embedded Signup is not configured on the server.',
        null,
        null,
        false,
      );
    }
    const query = new URLSearchParams({ client_id: metaAppId, client_secret: metaAppSecret, code });
    const response = await this.request<Json>(`oauth/access_token?${query.toString()}`, {});
    const accessToken = str(response.access_token);
    if (!accessToken) {
      throw new WhatsAppProviderError(
        'Meta did not return an access token for this signup.',
        null,
        null,
        false,
      );
    }
    return { accessToken };
  }

  private safeMediaUrl(raw: string): string {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new WhatsAppProviderError('Meta returned an invalid media URL.', null, null, false);
    }
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !MEDIA_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
      throw new WhatsAppProviderError(
        'Meta returned a media URL on an unexpected host.',
        null,
        null,
        false,
      );
    }
    return url.toString();
  }

  private async fetchOrThrow(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      const timedOut =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new WhatsAppProviderError(
        timedOut ? 'Meta did not respond in time.' : 'Could not reach the Meta Graph API.',
        timedOut ? 'timeout' : 'network',
        null,
        true,
      );
    }
  }

  private async request<T = Json>(
    path: string,
    options: {
      token?: string;
      method?: 'GET' | 'POST' | 'DELETE';
      json?: unknown;
      form?: FormData;
      absolute?: boolean;
      timeoutMs?: number;
    },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    let body: string | FormData | undefined;
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    } else if (options.form) {
      body = options.form;
    }
    const response = await this.fetchOrThrow(options.absolute ? path : `${this.baseUrl}/${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      redirect: 'error',
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = null;
    }
    if (response.ok && parsed !== null) return parsed as T;
    throw this.toError(response.status, obj(obj(parsed)?.error));
  }

  private toError(status: number, error: Json | null): WhatsAppProviderError {
    const code = error ? str(error.code) || null : null;
    const userMessage = error ? str(error.error_user_msg) || str(error.message) : '';
    const message =
      (code && FRIENDLY_MESSAGES[code]) ||
      (userMessage ? redact(userMessage) : `Meta Graph API request failed (HTTP ${status}).`);
    const retryable =
      status === 429 || status >= 500 || (code !== null && RETRYABLE_CODES.has(code));
    const credentialProblem = status === 401 || (code !== null && CREDENTIAL_CODES.has(code));
    return new WhatsAppProviderError(message, code, status, retryable, credentialProblem);
  }
}
