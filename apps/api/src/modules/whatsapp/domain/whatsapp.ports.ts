/**
 * Ports implemented by infrastructure adapters. Meta-specific wire formats stay
 * inside the provider adapter; everything here is provider-neutral.
 */
import type { TemplateSendParameter } from './whatsapp-template.js';

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
export const WHATSAPP_CREDENTIAL_CIPHER = Symbol('WHATSAPP_CREDENTIAL_CIPHER');
export const WHATSAPP_MEDIA_STORE = Symbol('WHATSAPP_MEDIA_STORE');
export const WHATSAPP_DISTRIBUTED_LOCK = Symbol('WHATSAPP_DISTRIBUTED_LOCK');
export const WHATSAPP_SETTINGS = Symbol('WHATSAPP_SETTINGS');

export interface WhatsAppProviderCredentials {
  readonly accessToken: string;
  readonly businessAccountId: string;
  readonly phoneNumberId: string;
}

export interface ProviderPhoneNumberInfo {
  readonly displayPhoneNumber: string;
  readonly verifiedName: string;
  readonly qualityRating: string | null;
  readonly messagingLimitTier: string | null;
}

export type ProviderOutboundMessage =
  | { readonly kind: 'text'; readonly body: string }
  | {
      readonly kind: 'media';
      readonly mediaType: 'image' | 'video' | 'audio' | 'document';
      readonly mediaId: string;
      readonly caption?: string;
      readonly fileName?: string;
    }
  | {
      readonly kind: 'template';
      readonly name: string;
      readonly language: string;
      readonly parameters: readonly TemplateSendParameter[];
    };

export interface ProviderTemplate {
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly category: string;
  readonly status: string;
  readonly rejectedReason: string | null;
  readonly qualityScore: string | null;
  readonly components: readonly unknown[];
}

export interface ProviderTemplateDraft {
  readonly name: string;
  readonly language: string;
  readonly category: string;
  readonly components: readonly unknown[];
}

export interface WhatsAppProviderPort {
  /** Confirms the token can read the phone number and that it belongs to the business account. */
  verifyPhoneNumber(credentials: WhatsAppProviderCredentials): Promise<ProviderPhoneNumberInfo>;
  /** Subscribes the Meta app to the business account so webhooks are delivered. */
  subscribeApp(credentials: WhatsAppProviderCredentials): Promise<void>;
  sendMessage(
    credentials: WhatsAppProviderCredentials,
    toWaId: string,
    message: ProviderOutboundMessage,
  ): Promise<{ readonly providerMessageId: string }>;
  markRead(credentials: WhatsAppProviderCredentials, providerMessageId: string): Promise<void>;
  uploadMedia(
    credentials: WhatsAppProviderCredentials,
    file: { readonly buffer: Buffer; readonly mimeType: string; readonly fileName: string },
  ): Promise<{ readonly mediaId: string }>;
  downloadMedia(
    credentials: WhatsAppProviderCredentials,
    mediaId: string,
    maxBytes: number,
  ): Promise<{ readonly buffer: Buffer; readonly mimeType: string }>;
  listTemplates(credentials: WhatsAppProviderCredentials): Promise<readonly ProviderTemplate[]>;
  createTemplate(
    credentials: WhatsAppProviderCredentials,
    draft: ProviderTemplateDraft,
  ): Promise<{ readonly id: string; readonly status: string; readonly category: string }>;
  exchangeEmbeddedSignupCode(code: string): Promise<{ readonly accessToken: string }>;
}

export interface WhatsAppCredentialCipherPort {
  isConfigured(): boolean;
  seal(plaintext: string, associatedData: string): string;
  open(envelope: string, associatedData: string): string;
}

export interface WhatsAppMediaStorePort {
  store(params: {
    readonly organizationId: string;
    readonly adminId: string;
    readonly buffer: Buffer;
    readonly mimeType: string;
    readonly fileName: string;
    readonly extension: string;
  }): Promise<{ readonly storedObjectId: string; readonly sizeBytes: number }>;
  open(
    organizationId: string,
    storedObjectId: string,
  ): Promise<{
    readonly redirectUrl?: string;
    readonly stream?: { readonly body: Buffer; readonly contentType: string };
  }>;
}

export interface WhatsAppDistributedLockPort {
  /** Runs `task` only if the lock is free; returns false when another instance holds it. */
  runExclusive(name: string, ttlMs: number, task: () => Promise<void>): Promise<boolean>;
}

export interface WhatsAppSettings {
  readonly webhookBaseUrl: string | null;
  readonly graphApiVersion: string;
  readonly mediaMaxBytes: number;
  readonly workerEnabled: boolean;
  /** Fallback signature secret for channels created without their own app secret. */
  readonly defaultAppSecret: string | null;
  readonly embeddedSignup: {
    readonly appId: string | null;
    readonly configId: string | null;
    readonly hasAppSecret: boolean;
  };
}
