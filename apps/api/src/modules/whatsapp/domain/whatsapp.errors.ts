export type WhatsAppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'POLICY_BLOCKED'
  | 'NOT_CONFIGURED'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED_WEBHOOK';

export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly code: WhatsAppErrorCode,
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class WhatsAppNotFoundError extends WhatsAppError {
  constructor(entity = 'Record') {
    super(`${entity} not found.`, 'NOT_FOUND');
  }
}

export class WhatsAppValidationError extends WhatsAppError {
  constructor(message: string) {
    super(message, 'VALIDATION_FAILED');
  }
}

export class WhatsAppConflictError extends WhatsAppError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

export class WhatsAppForbiddenError extends WhatsAppError {
  constructor(message = 'You do not have access to this conversation.') {
    super(message, 'FORBIDDEN');
  }
}

/** A WhatsApp messaging or consent policy prevents the action. */
export class WhatsAppPolicyError extends WhatsAppError {
  constructor(message: string) {
    super(message, 'POLICY_BLOCKED');
  }
}

export class WhatsAppNotConfiguredError extends WhatsAppError {
  constructor(message: string) {
    super(message, 'NOT_CONFIGURED');
  }
}

export class WhatsAppRateLimitedError extends WhatsAppError {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many requests. Please wait a moment and try again.', 'RATE_LIMITED');
  }
}

export class WhatsAppWebhookRejectedError extends WhatsAppError {
  constructor() {
    super('Webhook request rejected.', 'UNAUTHORIZED_WEBHOOK');
  }
}

/**
 * Failure reported by the Meta Graph API. `message` is safe to show to staff:
 * it never contains credentials.
 */
export class WhatsAppProviderError extends WhatsAppError {
  constructor(
    message: string,
    readonly providerCode: string | null,
    readonly httpStatus: number | null,
    readonly retryable: boolean,
    readonly credentialProblem = false,
  ) {
    super(message, 'PROVIDER_ERROR');
  }
}
