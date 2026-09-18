import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificationsModule } from '../notifications/notifications.module.js';
import {
  AdminVerificationController,
  BuyerVerificationController,
  SellerDocumentsController,
} from './verification.controller.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), NotificationsModule],
  controllers: [SellerDocumentsController, BuyerVerificationController, AdminVerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
