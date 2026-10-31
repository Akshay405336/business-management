import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, PLATFORM_CSRF_HEADER, REQUEST_ID_HEADER } from '@techwin/contracts';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { NoStoreInterceptor } from './common/interceptors/no-store.interceptor.js';
import { createSchemaValidationPipe } from './common/validation/schema-validation.pipe.js';
import { APP_CONFIG, loadAppConfig, type AppConfig } from './config/app-config.js';
import { loadEnvFile } from './config/load-env-file.js';

async function bootstrap(): Promise<void> {
  loadEnvFile();
  // Validate before building the container so misconfiguration fails fast and clearly.
  loadAppConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
    // Keeps the exact request bytes on `req.rawBody` for webhook signature checks.
    rawBody: true,
  });
  const config = app.get<AppConfig>(APP_CONFIG);
  app.useLogger(app.get(Logger));

  app.set('trust proxy', config.http.trustProxy);
  app.disable('x-powered-by');
  const whatsappWebhookPath = `${API_PREFIX}/webhooks/whatsapp/`;
  // Meta batches can exceed the general body limit; scoped to the signed webhook path only.
  app.useBodyParser('json', {
    limit: '2mb',
    type: (req: { url?: string }) => (req.url ?? '').startsWith(whatsappWebhookPath),
  });
  app.useBodyParser('json', { limit: config.http.bodyLimit });
  app.use(cookieParser());
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  const allowedOrigins = new Set(config.http.corsAllowedOrigins);
  app.enableCors({
    origin: (origin, callback) =>
      callback(null, origin === undefined || allowedOrigins.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', PLATFORM_CSRF_HEADER, REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER, 'retry-after'],
    maxAge: 600,
  });

  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''));
  app.useGlobalPipes(createSchemaValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new NoStoreInterceptor());
  app.enableShutdownHooks();

  if (config.swagger.enabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Techwin API')
        .setDescription(
          'Platform administration API. Errors use a shared `{ statusCode, error }` envelope.',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .addCookieAuth('tw_platform_rt', { type: 'apiKey', in: 'cookie' }, 'platform-refresh')
        .addCookieAuth('tw_platform_ch', { type: 'apiKey', in: 'cookie' }, 'platform-challenge')
        .build(),
    );
    SwaggerModule.setup(`${API_PREFIX.slice(1)}/docs`, app, document, {
      jsonDocumentUrl: `${API_PREFIX.slice(1)}/docs/openapi.json`,
    });
  }

  await app.listen(config.http.port, config.http.host);
  app
    .get(Logger)
    .log(
      `Techwin API listening on http://${config.http.host}:${config.http.port}${API_PREFIX}`,
      'Bootstrap',
    );
}

bootstrap().catch((error: unknown) => {
  // Configuration errors list variable names only, never their values.
  process.stderr.write(
    `Failed to start Techwin API: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
