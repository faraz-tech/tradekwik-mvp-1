import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  // Behind a reverse proxy / load balancer, set TRUST_PROXY=1 so req.ip is the real client IP
  // (needed for the admin IP allow-list and OTP per-IP limits).
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

  // uploaded images (dev: local disk)
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  // API reference is public in dev only. In production set ENABLE_SWAGGER=1 to expose it deliberately.
  const swaggerEnabled =
    process.env.ENABLE_SWAGGER === '1' || process.env.NODE_ENV !== 'production';
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TradeKwik API')
    .setDescription('Multi-vendor B2B/B2C commerce platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('token')
    .build();
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`TradeKwik API running on http://localhost:${port}/api/v1`);
  if (swaggerEnabled) console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
await bootstrap();
