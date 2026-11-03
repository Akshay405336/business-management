import type { Request } from 'express';

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function fromParsedExpressQuery(query: Request['query']): {
  mode: unknown;
  token: unknown;
  challenge: unknown;
} {
  const hub = query.hub;
  if (hub !== null && typeof hub === 'object' && !Array.isArray(hub)) {
    const record = hub as Record<string, unknown>;
    return {
      mode: record.mode ?? query['hub.mode'],
      token: record.verify_token ?? query['hub.verify_token'],
      challenge: record.challenge ?? query['hub.challenge'],
    };
  }
  return {
    mode: query['hub.mode'],
    token: query['hub.verify_token'],
    challenge: query['hub.challenge'],
  };
}

/**
 * Meta sends `hub.mode`, `hub.verify_token` and `hub.challenge`. Express `qs` may nest
 * these under `query.hub`; URLSearchParams reads the literal dotted keys reliably.
 */
export function metaWebhookVerifyParams(request: Request): {
  mode: unknown;
  token: unknown;
  challenge: unknown;
} {
  const url = request.originalUrl ?? request.url ?? '';
  const qIdx = url.indexOf('?');
  if (qIdx >= 0) {
    const params = new URLSearchParams(url.slice(qIdx + 1));
    const mode = params.get('hub.mode');
    const token = params.get('hub.verify_token');
    const challenge = params.get('hub.challenge');
    if (mode !== null || token !== null || challenge !== null) {
      return {
        mode: mode ?? undefined,
        token: token ?? undefined,
        challenge: challenge ?? undefined,
      };
    }
  }
  return fromParsedExpressQuery(request.query);
}

/** Aligns with create-channel validation, which stores SHA-256 of the trimmed verify token. */
export function normalizeMetaVerifyField(value: unknown): string | undefined {
  const raw = firstString(value);
  return raw === undefined ? undefined : raw.trim();
}
