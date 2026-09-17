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

  // uploaded images (dev: local disk)
  const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TradeKwik API')
    .setDescription('Multi-vendor B2B/B2C commerce platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`TradeKwik API running on http://localhost:${port}/api/v1`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
await bootstrap();
