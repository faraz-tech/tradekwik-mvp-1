import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { DbModule } from './db/db.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { SellersModule } from './modules/sellers/sellers.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { SitemapModule } from './modules/sitemap/sitemap.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    CategoriesModule,
    SellersModule,
    ProductsModule,
    SitemapModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
