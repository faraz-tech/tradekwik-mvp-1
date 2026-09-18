import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OrderRequestsModule } from '../orders/order-requests.module.js';
import { BuyerController } from './buyer.controller.js';
import { BuyerService } from './buyer.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), OrderRequestsModule],
  controllers: [BuyerController],
  providers: [BuyerService],
})
export class BuyerModule {}
