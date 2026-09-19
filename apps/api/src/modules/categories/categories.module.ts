import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import {
  AdminCategoriesController,
  CategoriesController,
  SellerCategoryRequestsController,
} from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CategoriesController, SellerCategoryRequestsController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
