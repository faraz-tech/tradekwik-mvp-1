import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { OrderRequestsController } from './order-requests.controller.js';
import { OrderRequestsService } from './order-requests.service.js';
import { OrderLifecycleService } from './order-lifecycle.service.js';

@Module({
  imports: [NotificationsModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [OrderRequestsController],
  providers: [OrderRequestsService, OrderLifecycleService],
  exports: [OrderLifecycleService],
})
export class OrderRequestsModule {}
