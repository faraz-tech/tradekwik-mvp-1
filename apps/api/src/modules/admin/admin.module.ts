import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [
    BillingModule,PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
