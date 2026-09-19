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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  convertInquirySchema,
  createOwnerSchema,
  createProductSchema,
  createTeamMemberSchema,
  inquiryListQuerySchema,
  orderListQuerySchema,
  sellerCompanyProfileInputSchema,
  updateInquirySchema,
  updateOrderRequestSchema,
  updateOwnerSchema,
  updateProductSchema,
  updateSellerProfileSchema,
  updateTeamMemberSchema,
  upsertShipmentSchema,
  type SellerCompanyProfileOwnDto,
  type SellerDashboardDto,
  type SellerInquiryDto,
  type SellerOrderDetailDto,
  type SellerOrderRequestDto,
  type SellerOwnerDto,
  type SellerProductDto,
  type SellerProfileDto,
  type SellerTeamMemberDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { SubscriptionGuard } from '../billing/subscription.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentSeller, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import type { Actor } from '../orders/order-lifecycle.service.js';
import { SellerService } from './seller.service.js';
import { SellerProductsService } from './seller-products.service.js';
import { SellerRequestsService } from './seller-requests.service.js';

class CreateProductDto extends createZodDto(createProductSchema) {}
class UpdateProductDto extends createZodDto(updateProductSchema) {}
class UpdateInquiryDto extends createZodDto(updateInquirySchema) {}
class ConvertInquiryDto extends createZodDto(convertInquirySchema) {}
class UpdateOrderRequestDto extends createZodDto(updateOrderRequestSchema) {}
class UpsertShipmentDto extends createZodDto(upsertShipmentSchema) {}
class UpdateProfileDto extends createZodDto(updateSellerProfileSchema) {}
class CompanyProfileDto extends createZodDto(sellerCompanyProfileInputSchema) {}
class CreateOwnerDto extends createZodDto(createOwnerSchema) {}
class UpdateOwnerDto extends createZodDto(updateOwnerSchema) {}
class CreateTeamMemberDto extends createZodDto(createTeamMemberSchema) {}
class UpdateTeamMemberDto extends createZodDto(updateTeamMemberSchema) {}
class InquiryListQueryDto extends createZodDto(inquiryListQuerySchema) {}
class OrderListQueryDto extends createZodDto(orderListQuerySchema) {}

/** Seller-side actor for the order event trail. */
function sellerActor(user: JwtPayload): Actor {
  return { type: 'seller', id: user.sub };
}

@ApiTags('seller')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@Roles('seller')
export class SellerController {
  constructor(
    private readonly sellerService: SellerService,
    private readonly productsService: SellerProductsService,
    private readonly requestsService: SellerRequestsService,
  ) {}

  // ---------- dashboard ----------

  @Get('dashboard')
  @RequirePermission('dashboard:read')
  @ApiOperation({ summary: 'Counts + 7-day inquiry trend' })
  async dashboard(@CurrentSeller() sellerId: string): Promise<Envelope<SellerDashboardDto>> {
    return { data: await this.sellerService.getDashboard(sellerId) };
  }

  // ---------- products ----------

  @Get('products')
  @RequirePermission('products:read')
  @ApiOperation({ summary: 'All own products, incl. unpublished' })
  async listProducts(@CurrentSeller() sellerId: string): Promise<Envelope<SellerProductDto[]>> {
    return { data: await this.productsService.list(sellerId) };
  }

  @Post('products')
  @RequirePermission('products:write')
  @ApiOperation({ summary: 'Create a product' })
  async createProduct(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateProductDto,
  ): Promise<Envelope<SellerProductDto>> {
    return { data: await this.productsService.create(sellerId, body) };
  }

  @Patch('products/:id')
  @RequirePermission('products:write')
  @ApiOperation({ summary: 'Update own product' })
  async updateProduct(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
  ): Promise<Envelope<SellerProductDto>> {
    return { data: await this.productsService.update(sellerId, id, body) };
  }

  @Delete('products/:id')
  @RequirePermission('products:write')
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
  @RequirePermission('inquiries:read')
  @ApiOperation({ summary: 'Own inquiries, optionally filtered by status' })
  async listInquiries(
    @CurrentSeller() sellerId: string,
    @Query() query: InquiryListQueryDto,
  ): Promise<Envelope<SellerInquiryDto[]>> {
    return { data: await this.requestsService.listInquiries(sellerId, query.status) };
  }

  @Patch('inquiries/:id')
  @RequirePermission('inquiries:write')
  @ApiOperation({ summary: 'Update inquiry status / notes' })
  async updateInquiry(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateInquiryDto,
  ): Promise<Envelope<SellerInquiryDto>> {
    return { data: await this.requestsService.updateInquiry(sellerId, id, body) };
  }

  @Post('inquiries/:id/convert')
  @RequirePermission('orders:write')
  @ApiOperation({ summary: 'Convert an inquiry into a confirmed order (with quote)' })
  async convertInquiry(
    @CurrentSeller() sellerId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConvertInquiryDto,
  ): Promise<Envelope<SellerOrderDetailDto>> {
    return { data: await this.requestsService.convertInquiry(sellerId, id, body, sellerActor(user)) };
  }

  // ---------- order requests ----------

  @Get('order-requests')
  @RequirePermission('orders:read')
  @ApiOperation({ summary: 'Own order requests, optionally filtered by status' })
  async listOrders(
    @CurrentSeller() sellerId: string,
    @Query() query: OrderListQueryDto,
  ): Promise<Envelope<SellerOrderRequestDto[]>> {
    return { data: await this.requestsService.listOrders(sellerId, query.status) };
  }

  @Get('order-requests/:id')
  @RequirePermission('orders:read')
  @ApiOperation({ summary: 'Order detail with timeline and transport details' })
  async orderDetail(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Envelope<SellerOrderDetailDto>> {
    return { data: await this.requestsService.orderDetail(sellerId, id) };
  }

  @Patch('order-requests/:id')
  @RequirePermission('orders:write')
  @ApiOperation({ summary: 'Move the order along its lifecycle, quote, or message the buyer' })
  async updateOrder(
    @CurrentSeller() sellerId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrderRequestDto,
  ): Promise<Envelope<SellerOrderDetailDto>> {
    return { data: await this.requestsService.updateOrder(sellerId, id, body, sellerActor(user)) };
  }

  @Put('order-requests/:id/shipment')
  @RequirePermission('shipments:write', 'orders:write')
  @ApiOperation({ summary: 'Record the transport booking (transporter, LR / bilty number, vehicle)' })
  async upsertShipment(
    @CurrentSeller() sellerId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpsertShipmentDto,
  ): Promise<Envelope<SellerOrderDetailDto>> {
    return { data: await this.requestsService.upsertShipment(sellerId, id, body, sellerActor(user)) };
  }

  // ---------- store profile ----------

  @Get('profile')
  @RequirePermission('profile:read')
  @ApiOperation({ summary: 'Own store profile' })
  async getProfile(@CurrentSeller() sellerId: string): Promise<Envelope<SellerProfileDto>> {
    return { data: await this.sellerService.getProfile(sellerId) };
  }

  @Patch('profile')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Update own store profile' })
  async updateProfile(
    @CurrentSeller() sellerId: string,
    @Body() body: UpdateProfileDto,
  ): Promise<Envelope<SellerProfileDto>> {
    return { data: await this.sellerService.updateProfile(sellerId, body) };
  }

  // ---------- company profile (About page) ----------

  @Get('company-profile')
  @RequirePermission('profile:read')
  @ApiOperation({ summary: 'Company details shown on the public About page' })
  async getCompanyProfile(
    @CurrentSeller() sellerId: string,
  ): Promise<Envelope<SellerCompanyProfileOwnDto>> {
    return { data: await this.sellerService.getCompanyProfile(sellerId) };
  }

  @Put('company-profile')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Create/update company details' })
  async updateCompanyProfile(
    @CurrentSeller() sellerId: string,
    @Body() body: CompanyProfileDto,
  ): Promise<Envelope<SellerCompanyProfileOwnDto>> {
    return { data: await this.sellerService.updateCompanyProfile(sellerId, body) };
  }

  // ---------- owners ----------

  @Get('owners')
  @RequirePermission('profile:read')
  @ApiOperation({ summary: 'People shown on the About page' })
  async listOwners(@CurrentSeller() sellerId: string): Promise<Envelope<SellerOwnerDto[]>> {
    return { data: await this.sellerService.listOwners(sellerId) };
  }

  @Post('owners')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Add an owner / key person' })
  async createOwner(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateOwnerDto,
  ): Promise<Envelope<SellerOwnerDto>> {
    return { data: await this.sellerService.createOwner(sellerId, body) };
  }

  @Patch('owners/:id')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Update an owner / key person' })
  async updateOwner(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOwnerDto,
  ): Promise<Envelope<SellerOwnerDto>> {
    return { data: await this.sellerService.updateOwner(sellerId, id, body) };
  }

  @Delete('owners/:id')
  @RequirePermission('profile:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an owner / key person' })
  async removeOwner(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.sellerService.removeOwner(sellerId, id);
  }

  // ---------- team ----------

  @Get('team')
  @RequirePermission('team:manage')
  @ApiOperation({ summary: 'Login users of this seller account' })
  async listTeam(@CurrentSeller() sellerId: string): Promise<Envelope<SellerTeamMemberDto[]>> {
    return { data: await this.sellerService.listTeam(sellerId) };
  }

  @Post('team')
  @RequirePermission('team:manage')
  @ApiOperation({ summary: 'Add a team member with a role' })
  async createTeamMember(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateTeamMemberDto,
  ): Promise<Envelope<SellerTeamMemberDto>> {
    return { data: await this.sellerService.createTeamMember(sellerId, body) };
  }

  @Patch('team/:id')
  @RequirePermission('team:manage')
  @ApiOperation({ summary: 'Change a team member’s role / name / password' })
  async updateTeamMember(
    @CurrentSeller() sellerId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTeamMemberDto,
  ): Promise<Envelope<SellerTeamMemberDto>> {
    return { data: await this.sellerService.updateTeamMember(sellerId, id, user.sub, body) };
  }

  @Delete('team/:id')
  @RequirePermission('team:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team member' })
  async removeTeamMember(
    @CurrentSeller() sellerId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.sellerService.removeTeamMember(sellerId, id, user.sub);
  }
}
