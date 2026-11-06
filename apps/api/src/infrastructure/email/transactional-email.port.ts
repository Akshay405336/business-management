export interface EmailAttachment {
  readonly filename: string;
  readonly contentType: string;
  readonly content: Buffer;
}

export interface OutboundEmailMessage {
  readonly to: readonly string[];
  readonly cc?: readonly string[];
  readonly bcc?: readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly attachments?: readonly EmailAttachment[];
}

export interface TransactionalEmailPort {
  send(message: OutboundEmailMessage): Promise<void>;
}

export const TRANSACTIONAL_EMAIL = Symbol('TRANSACTIONAL_EMAIL');
