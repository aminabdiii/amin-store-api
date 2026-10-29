import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic, { FastifyStaticOptions } from '@fastify/static';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { AppModule } from './app.module';
import { ApiExceptionFilter, RequestLogger } from './common/http';
import { configuration } from './common/config';
import { documentResponses } from './common/openapi';

export async function createApp(): Promise<NestFastifyApplication> {
  const config = configuration();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 1024 * 1024,
      genReqId: () => randomUUID(),
      requestIdHeader: false,
    }),
    { logger: ['warn', 'error'] },
  );
  const server = app.getHttpAdapter().getInstance();
  await app.register(helmet);
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    throwFileSizeLimit: true,
  });
  await app.register(rateLimit, { global: false });
  type Limiter = ReturnType<FastifyInstance['createRateLimit']>;
  let apiLimit!: Limiter;
  let authLimit!: Limiter;
  let viewsLimit!: Limiter;
  server.addHook('onReady', async () => {
    apiLimit = server.createRateLimit({
      max: 500,
      timeWindow: 60_000,
      keyGenerator: (req) => `api:${req.ip}`,
    });
    authLimit = server.createRateLimit({
      max: 40,
      timeWindow: 60_000,
      keyGenerator: (req) => `auth:${req.ip}`,
    });
    viewsLimit = server.createRateLimit({
      max: 100,
      timeWindow: 60_000,
      keyGenerator: (req) => `views:${req.ip}`,
    });
  });
  server.addHook('onRequest', async (req, reply) => {
    reply.header('X-Request-ID', req.id);
  });
  server.addHook('preParsing', async (req, reply, payload) => {
    const path = req.url.split('?')[0];
    if (!path.startsWith('/api/')) return payload;
    const limits = [apiLimit];
    if (path.startsWith('/api/v1/auth/')) limits.push(authLimit);
    if (req.method === 'POST' && /^\/api\/v1\/products\/[^/]+\/views$/.test(path))
      limits.push(viewsLimit);
    for (const limit of limits) {
      const result = await limit(req);
      if (!result.isAllowed && result.isExceeded) {
        reply.code(429).header('Retry-After', result.ttlInSeconds).send({
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests; try again later',
          requestId: req.id,
        });
        return payload;
      }
    }
    return payload;
  });
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID'],
  });
  await mkdir(config.mediaDir, { recursive: true, mode: 0o700 });
  const staticOptions: FastifyStaticOptions = {
    root: config.mediaDir,
    prefix: '/media/',
    dotfiles: 'deny',
    index: false,
    immutable: true,
    maxAge: '1y',
    setHeaders: (reply) => {
      reply.header('X-Content-Type-Options', 'nosniff');
    },
  };
  await app.register(fastifyStatic, staticOptions);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new RequestLogger());
  const builder = new DocumentBuilder()
    .setTitle('Amin Store API')
    .setDescription(
      'Local store REST API. Prices are USD decimal strings. Initial migrated inventory is zero. Checkout does not collect payment. Refresh tokens are returned in the response body.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, builder);
  documentResponses(document);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/openapi.json' });
  app.enableShutdownHooks();
  return app;
}
