import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SellersController } from './sellers.controller.js';
import { SellersService } from './sellers.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [SellersController],
  providers: [SellersService],
})
export class SellersModule {}
