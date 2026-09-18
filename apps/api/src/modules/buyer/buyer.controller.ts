import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  buyerOrderActionSchema,
  updateBuyerProfileSchema,
  type BuyerDashboardDto,
  type BuyerInquiryDto,
  type BuyerOrderDetailDto,
  type BuyerOrderDto,
  type BuyerProfileDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentBuyer } from '../../common/decorators/current-user.decorator.js';
import { BuyerService } from './buyer.service.js';

class UpdateBuyerProfileDto extends createZodDto(updateBuyerProfileSchema) {}
class BuyerOrderActionDto extends createZodDto(buyerOrderActionSchema) {}

@ApiTags('buyer')
@ApiCookieAuth('buyer_token')
@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Counts + recent orders for the customer dashboard' })
  async dashboard(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerDashboardDto>> {
    return { data: await this.buyerService.getDashboard(buyerId) };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Own buyer profile' })
  async profile(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerProfileDto>> {
    return { data: await this.buyerService.getProfile(buyerId) };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update own buyer profile' })
  async updateProfile(
    @CurrentBuyer() buyerId: string,
    @Body() body: UpdateBuyerProfileDto,
  ): Promise<Envelope<BuyerProfileDto>> {
    return { data: await this.buyerService.updateProfile(buyerId, body) };
  }

  @Get('inquiries')
  @ApiOperation({ summary: 'Inquiries sent by this buyer' })
  async inquiries(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerInquiryDto[]>> {
    return { data: await this.buyerService.listInquiries(buyerId) };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Orders of this buyer' })
  async orders(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerOrderDto[]>> {
    return { data: await this.buyerService.listOrders(buyerId) };
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Order detail with timeline and transport (bilty) details' })
  async order(
    @CurrentBuyer() buyerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Envelope<BuyerOrderDetailDto>> {
    return { data: await this.buyerService.orderDetail(buyerId, id) };
  }

  @Post('orders/:id/actions')
  @ApiOperation({ summary: 'Confirm receipt, cancel a new request, or message the seller' })
  async orderAction(
    @CurrentBuyer() buyerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: BuyerOrderActionDto,
  ): Promise<Envelope<BuyerOrderDetailDto>> {
    const profile = await this.buyerService.getProfile(buyerId);
    return { data: await this.buyerService.orderAction(buyerId, id, body, profile.fullName) };
  }
}
