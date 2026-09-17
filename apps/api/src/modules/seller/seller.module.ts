import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SellerController } from './seller.controller.js';
import { SellerService } from './seller.service.js';
import { SellerProductsService } from './seller-products.service.js';
import { SellerRequestsService } from './seller-requests.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [SellerController],
  providers: [SellerService, SellerProductsService, SellerRequestsService],
})
export class SellerModule {}
