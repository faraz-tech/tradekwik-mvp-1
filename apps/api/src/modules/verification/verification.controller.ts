import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  createBuyerDocumentSchema,
  createDocumentSchema,
  reviewBuyerSchema,
  reviewDocumentSchema,
  updateDocumentSchema,
  type AdminBuyerVerificationDto,
  type AdminSellerVerificationDto,
  type BuyerVerificationDto,
  type SellerVerificationDto,
  type VerificationQueueDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentBuyer, CurrentSeller, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { VerificationService } from './verification.service.js';

class CreateDocumentDto extends createZodDto(createDocumentSchema) {}
class CreateBuyerDocumentDto extends createZodDto(createBuyerDocumentSchema) {}
class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}
class ReviewDocumentDto extends createZodDto(reviewDocumentSchema) {}
class ReviewBuyerDto extends createZodDto(reviewBuyerSchema) {}

// ---------------- seller ----------------

@ApiTags('seller')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('seller/documents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('seller')
export class SellerDocumentsController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  @RequirePermission('profile:read')
  @ApiOperation({ summary: 'Verification checklist + uploaded documents' })
  async overview(@CurrentSeller() sellerId: string): Promise<Envelope<SellerVerificationDto>> {
    return { data: await this.verification.sellerOverview(sellerId) };
  }

  @Post()
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Register an uploaded document for review' })
  async add(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateDocumentDto,
  ): Promise<Envelope<SellerVerificationDto>> {
    return { data: await this.verification.addSellerDocument(sellerId, body) };
  }

  @Patch(':id')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Rename / publish / set expiry of a document' })
  async update(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDocumentDto,
  ): Promise<Envelope<SellerVerificationDto>> {
    return { data: await this.verification.updateSellerDocument(sellerId, id, body) };
  }

  @Delete(':id')
  @RequirePermission('profile:write')
  @ApiOperation({ summary: 'Remove a document' })
  async remove(
    @CurrentSeller() sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Envelope<SellerVerificationDto>> {
    return { data: await this.verification.removeSellerDocument(sellerId, id) };
  }
}

// ---------------- buyer ----------------

@ApiTags('buyer')
@ApiCookieAuth('buyer_token')
@Controller('buyer/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
export class BuyerVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Own verification status + documents' })
  async overview(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerVerificationDto>> {
    return { data: await this.verification.buyerOverview(buyerId) };
  }

  @Post('documents')
  @ApiOperation({ summary: 'Register an uploaded document' })
  async add(
    @CurrentBuyer() buyerId: string,
    @Body() body: CreateBuyerDocumentDto,
  ): Promise<Envelope<BuyerVerificationDto>> {
    return { data: await this.verification.addBuyerDocument(buyerId, body) };
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Remove a document' })
  async remove(
    @CurrentBuyer() buyerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Envelope<BuyerVerificationDto>> {
    return { data: await this.verification.removeBuyerDocument(buyerId, id) };
  }

  @Post('request')
  @ApiOperation({ summary: 'Ask TradeKwik to review the business verification' })
  async request(@CurrentBuyer() buyerId: string): Promise<Envelope<BuyerVerificationDto>> {
    return { data: await this.verification.requestBuyerReview(buyerId) };
  }
}

// ---------------- admin (verifier) ----------------

@ApiTags('admin')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('admin/verification')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('queue')
  @RequirePermission('sellers:verify', 'buyers:verify')
  @ApiOperation({ summary: 'Sellers with pending/missing documents + buyers awaiting review' })
  async queue(): Promise<Envelope<VerificationQueueDto>> {
    return { data: await this.verification.queue() };
  }

  @Get('sellers/:id')
  @RequirePermission('sellers:verify')
  @ApiOperation({ summary: 'One seller’s documents and checklist' })
  async seller(@Param('id', ParseUUIDPipe) id: string): Promise<Envelope<AdminSellerVerificationDto>> {
    return { data: await this.verification.adminSeller(id) };
  }

  @Patch('documents/:id')
  @RequirePermission('sellers:verify')
  @ApiOperation({ summary: 'Approve or reject a seller document (badge recomputed)' })
  async reviewDocument(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewDocumentDto,
  ): Promise<Envelope<AdminSellerVerificationDto>> {
    return { data: await this.verification.reviewSellerDocument(id, user.sub, body) };
  }

  @Patch('buyers/:id')
  @RequirePermission('buyers:verify')
  @ApiOperation({ summary: 'Approve or reject a buyer’s business verification' })
  async reviewBuyer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewBuyerDto,
  ): Promise<Envelope<AdminBuyerVerificationDto>> {
    return { data: await this.verification.reviewBuyer(id, user.sub, body) };
  }
}
