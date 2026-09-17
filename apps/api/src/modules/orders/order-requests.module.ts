import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrderRequestsController } from './order-requests.controller.js';
import { OrderRequestsService } from './order-requests.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [OrderRequestsController],
  providers: [OrderRequestsService],
})
export class OrderRequestsModule {}
