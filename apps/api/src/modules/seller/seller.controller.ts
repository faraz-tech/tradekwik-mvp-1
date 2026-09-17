import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  createProductSchema,
  inquiryListQuerySchema,
  orderListQuerySchema,
  updateInquirySchema,
  updateOrderRequestSchema,
  updateProductSchema,
  updateSellerProfileSchema,
  type SellerDashboardDto,
  type SellerInquiryDto,
  type SellerOrderRequestDto,
  type SellerProductDto,
  type SellerProfileDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentSeller } from '../../common/decorators/current-user.decorator.js';
import { SellerService } from './seller.service.js';
import { SellerProductsService } from './seller-products.service.js';
import { SellerRequestsService } from './seller-requests.service.js';

class CreateProductDto extends createZodDto(createProductSchema) {}
class UpdateProductDto extends createZodDto(updateProductSchema) {}
class UpdateInquiryDto extends createZodDto(updateInquirySchema) {}
class UpdateOrderRequestDto extends createZodDto(updateOrderRequestSchema) {}
class UpdateProfileDto extends createZodDto(updateSellerProfileSchema) {}
class InquiryListQueryDto extends createZodDto(inquiryListQuerySchema) {}
class OrderListQueryDto extends createZodDto(orderListQuerySchema) {}

@ApiTags('seller')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly productsService: SellerProductsService,
    private readonly requestsService: SellerRequestsService,
  ) {}

  // ---------- dashboard ----------

  @Get('dashboard')
  @ApiOperation({ summary: 'Counts + 7-day inquiry trend' })
  async dashboard(@CurrentSeller() sellerId: string): Promise<Envelope<SellerDashboardDto>> {
    return { data: await this.sellerService.getDashboard(sellerId) };
  }

  // ---------- products ----------

  @Get('products')
  @ApiOperation({ summary: 'All own products, incl. unpublished' })
  async listProducts(@CurrentSeller() sellerId: string): Promise<Envelope<SellerProductDto[]>> {
    return { data: await this.productsService.list(sellerId) };
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a product' })
  async createProduct(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateProductDto,
  ): Promise<Envelope<SellerProductDto>> {
    return { data: await this.productsService.create(sellerId, body) };
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update own product' })
  async updateProduct(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
  ): Promise<Envelope<SellerProductDto>> {
    return { data: await this.productsService.update(sellerId, id, body) };
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own product' })
  async deleteProduct(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.productsService.remove(sellerId, id);
  }

  // ---------- inquiries ----------

  @Get('inquiries')
  @ApiOperation({ summary: 'Own inquiries, optionally filtered by status' })
  async listInquiries(
    @CurrentSeller() sellerId: string,
    @Query() query: InquiryListQueryDto,
  ): Promise<Envelope<SellerInquiryDto[]>> {
    return { data: await this.requestsService.listInquiries(sellerId, query.status) };
  }

  @Patch('inquiries/:id')
  @ApiOperation({ summary: 'Update inquiry status / notes' })
  async updateInquiry(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInquiryDto,
  ): Promise<Envelope<SellerInquiryDto>> {
    return { data: await this.requestsService.updateInquiry(sellerId, id, body) };
  }

  // ---------- order requests ----------

  @Get('order-requests')
  @ApiOperation({ summary: 'Own order requests, optionally filtered by status' })
  async listOrders(
    @CurrentSeller() sellerId: string,
    @Query() query: OrderListQueryDto,
  ): Promise<Envelope<SellerOrderRequestDto[]>> {
    return { data: await this.requestsService.listOrders(sellerId, query.status) };
  }

  @Patch('order-requests/:id')
  @ApiOperation({ summary: 'Update order request status / notes' })
  async updateOrder(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderRequestDto,
  ): Promise<Envelope<SellerOrderRequestDto>> {
    return { data: await this.requestsService.updateOrder(sellerId, id, body) };
  }

  // ---------- profile ----------

  @Get('profile')
  @ApiOperation({ summary: 'Own store profile' })
  async getProfile(@CurrentSeller() sellerId: string): Promise<Envelope<SellerProfileDto>> {
    return { data: await this.sellerService.getProfile(sellerId) };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own store profile' })
  async updateProfile(
    @CurrentSeller() sellerId: string,
    @Body() body: UpdateProfileDto,
  ): Promise<Envelope<SellerProfileDto>> {
    return { data: await this.sellerService.updateProfile(sellerId, body) };
  }
}
