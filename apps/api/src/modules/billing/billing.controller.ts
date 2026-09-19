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
  extendTrialSchema,
  grantPlanSchema,
  type SellerSubscriptionDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentSeller, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { BillingService } from './billing.service.js';

class GrantPlanDto extends createZodDto(grantPlanSchema) {}
class ExtendTrialDto extends createZodDto(extendTrialSchema) {}

@ApiTags('seller')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('seller/subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
export class SellerBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Current plan / trial state, limits usage and payment history' })
  async get(@CurrentSeller() sellerId: string): Promise<Envelope<SellerSubscriptionDto>> {
    return { data: await this.billing.summary(sellerId) };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('admin/sellers/:id/subscription')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermission('sellers:write')
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Subscription state and history of a seller' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<Envelope<SellerSubscriptionDto>> {
    return { data: await this.billing.summary(id) };
  }

  @Post()
  @ApiOperation({ summary: 'Activate a plan after an offline payment (extends the current period if active)' })
  async grant(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GrantPlanDto,
  ): Promise<Envelope<SellerSubscriptionDto>> {
    return { data: await this.billing.grant(id, user.sub, body) };
  }

  @Patch('trial')
  @ApiOperation({ summary: 'Extend (or restart) the free trial by N days' })
  async extendTrial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ExtendTrialDto,
  ): Promise<Envelope<SellerSubscriptionDto>> {
    return { data: await this.billing.extendTrial(id, body) };
  }

  @Delete('grants/:grantId')
  @ApiOperation({ summary: 'Remove a grant entered by mistake' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('grantId', ParseUUIDPipe) grantId: string,
  ): Promise<Envelope<SellerSubscriptionDto>> {
    return { data: await this.billing.revokeGrant(id, grantId) };
  }
}
