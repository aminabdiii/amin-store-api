import 'reflect-metadata';
import { Controller, Get, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { AuthGuard, Public } from './auth/auth.guard';
import { AuthModule } from './auth/auth.controller';
import { Database, DatabaseModule } from './common/database';
import { ApiExceptionFilter, ApiRequest, RequestLogger } from './common/http';
import { configuration } from './common/config';
import { UsersModule } from './users/users.controller';
import { CatalogModule } from './catalog/catalog.controller';
import { CartModule } from './cart/cart.controller';
import { OrdersModule } from './orders/orders.controller';
import { ReviewsModule } from './reviews/reviews.controller';
import { ContentModule } from './content/content.controller';
import { MediaModule } from './media/media.controller';
import { documentResponses } from './common/openapi';
@Public()
@Controller('health')
class HealthController {
  constructor(private readonly db: Database) {}
  @Get() async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ContentModule,
    MediaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
export async function createApp() {
  const config = configuration();
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'], bodyParser: false });
  app.use(helmet());
  app.use((req: ApiRequest, res: Response, next: NextFunction) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });
  app.enableCors({
    origin: config.corsOrigins,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID'],
  });
  const handler = (req: Request, res: Response) =>
    res.status(429).json({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests; try again later',
      requestId: (req as ApiRequest).requestId,
    });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 500,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler,
    }),
  );
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60_000,
      limit: 40,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler,
    }),
  );
  app.use(
    '/api/v1/products',
    rateLimit({
      windowMs: 60_000,
      limit: 100,
      skip: (req) => req.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  await mkdir(config.mediaDir, { recursive: true, mode: 0o700 });
  app.use(
    '/media',
    express.static(config.mediaDir, {
      dotfiles: 'deny',
      index: false,
      immutable: true,
      maxAge: '1y',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );
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
