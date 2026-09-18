import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { InquiriesController } from './inquiries.controller.js';
import { InquiriesService } from './inquiries.service.js';

@Module({
  imports: [NotificationsModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
