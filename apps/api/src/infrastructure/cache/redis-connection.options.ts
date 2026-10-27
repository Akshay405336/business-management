import type { RedisOptions } from 'ioredis';

export type ParsedRedisConnection = {
  readonly url: string;
  readonly host: string;
  readonly port: number;
  readonly tls: boolean;
  /** True when TLS was enabled because the hostname requires it (e.g. Upstash) but the URL used redis:// */
  readonly tlsInferredFromHost: boolean;
  readonly username: string | null;
};

/** Hostnames that only accept TLS on the standard Redis port (Upstash REST/TLS endpoints). */
export function hostRequiresTls(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith('.upstash.io') || h === 'upstash.io';
}

/**
 * Parses a Redis URL for client options. Never log the return value's url field
 * in production logs — it contains credentials.
 */
export function parseRedisConnection(urlString: string): ParsedRedisConnection {
  const trimmed = urlString.trim();
  const url = new URL(trimmed);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('Redis URL must use redis:// or rediss://');
  }
  const port = url.port ? Number(url.port) : 6379;
  if (!Number.isFinite(port)) {
    throw new Error('Redis URL port is invalid');
  }
  const schemeTls = url.protocol === 'rediss:';
  const tlsInferredFromHost = !schemeTls && hostRequiresTls(url.hostname);
  return {
    url: trimmed,
    host: url.hostname,
    port,
    tls: schemeTls || tlsInferredFromHost,
    tlsInferredFromHost,
    username: url.username ? decodeURIComponent(url.username) : null,
  };
}

/**
 * Connection URL for the ioredis constructor. Never log the return value — it contains credentials.
 * ioredis selects TLS from the URL scheme; Upstash URLs copied as redis:// must be upgraded to rediss://.
 */
export function ioredisConnectionUrl(parsed: ParsedRedisConnection): string {
  if (parsed.tls && parsed.url.startsWith('redis://')) {
    return `rediss://${parsed.url.slice('redis://'.length)}`;
  }
  return parsed.url;
}

/** Safe connection summary for logs (no secrets). */
export function describeRedisConnection(parsed: ParsedRedisConnection): string {
  const user = parsed.username ? ` user=${parsed.username}` : '';
  const inferred = parsed.tlsInferredFromHost ? ' tlsInferredFromHost=true' : '';
  return `host=${parsed.host} port=${parsed.port} tls=${parsed.tls}${inferred}${user}`;
}

/**
 * ioredis 6 options for Techwin. Upstash and other TLS providers on port 6379
 * require an explicit TLS SNI hostname (`tls.servername`) or the server resets
 * the socket (ECONNRESET).
 */
export function buildIoredisOptions(parsed: ParsedRedisConnection): RedisOptions {
  return {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 10_000,
    commandTimeout: 5_000,
    keepAlive: 30_000,
    enableReadyCheck: true,
    retryStrategy: (attempt) => {
      if (attempt > 15) return null;
      return Math.min(attempt * 200, 3_000);
    },
    reconnectOnError(error) {
      const message = error.message.toLowerCase();
      return message.includes('econnreset') || message.includes('readonly');
    },
    ...(parsed.tls ? { tls: { servername: parsed.host } } : {}),
  };
}
