import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminBillingController, SellerBillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { SubscriptionGuard } from './subscription.guard.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [SellerBillingController, AdminBillingController],
  providers: [BillingService, SubscriptionGuard],
  exports: [BillingService, SubscriptionGuard],
})
export class BillingModule {}
