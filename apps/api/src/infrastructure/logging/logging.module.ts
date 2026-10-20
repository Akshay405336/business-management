import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { REQUEST_ID_HEADER } from '@techwin/contracts';
import { LoggerModule } from 'nestjs-pino';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Paths removed from every log record. Request/response serializers below
 * already omit headers and bodies; this list is defence in depth for values
 * that end up in log context objects.
 */
export const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.code',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.csrfToken',
  '*.challengeToken',
  '*.secret',
  '*.totpSecret',
  '*.authorization',
  '*.cookie',
];

function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId = candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return requestId;
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logging.level,
          genReqId: resolveRequestId,
          redact: { paths: REDACTED_LOG_PATHS, censor: '[REDACTED]' },
          serializers: {
            req: (req: { id: string; method: string; url: string; remoteAddress?: string }) => ({
              id: req.id,
              method: req.method,
              // Drop query strings so identifiers in URLs never reach the logs.
              url: req.url.split('?')[0],
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          customProps: (req: IncomingMessage & { ip?: string }) => ({ clientIp: req.ip }),
          autoLogging: {
            ignore: (req: IncomingMessage) => /\/api\/v1\/(health|ready)$/.test(req.url ?? ''),
          },
          ...(config.logging.pretty
            ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
            : {}),
        },
      }),
    }),
  ],
})
export class LoggingModule {}
