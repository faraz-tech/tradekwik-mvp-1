import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { ThrottlerModule } from '@nestjs/throttler';
import { DbModule } from './db/db.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { SellersModule } from './modules/sellers/sellers.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { SitemapModule } from './modules/sitemap/sitemap.module.js';
import { InquiriesModule } from './modules/inquiries/inquiries.module.js';
import { OrderRequestsModule } from './modules/orders/order-requests.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SellerModule } from './modules/seller/seller.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { BuyerModule } from './modules/buyer/buyer.module.js';
import { VerificationModule } from './modules/verification/verification.module.js';
import { OtpModule } from './modules/otp/otp.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 5 }],
      errorMessage: 'Too many requests. Please wait a minute and try again.',
    }),
    DbModule,
    CategoriesModule,
    SellersModule,
    ProductsModule,
    SitemapModule,
    InquiriesModule,
    OrderRequestsModule,
    AuthModule,
    SellerModule,
    UploadsModule,
    AdminModule,
    BuyerModule,
    VerificationModule,
    OtpModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
