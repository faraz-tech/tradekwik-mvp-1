import {
  Body,
  Controller,
  Get,
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
  adminSellerListQuerySchema,
  adminUpdateSellerSchema,
  createSellerSchema,
  type AdminInquiryDto,
  type AdminSellerDto,
  type ApiResponse as Envelope,
  type PlatformOverviewDto,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { AdminService } from './admin.service.js';

class CreateSellerDto extends createZodDto(createSellerSchema) {}
class AdminUpdateSellerDto extends createZodDto(adminUpdateSellerSchema) {}
class SellerListQueryDto extends createZodDto(adminSellerListQuerySchema) {}

@ApiTags('admin')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sellers')
  @RequirePermission('sellers:read')
  @ApiOperation({ summary: 'List sellers, optionally by status' })
  async listSellers(@Query() query: SellerListQueryDto): Promise<Envelope<AdminSellerDto[]>> {
    return { data: await this.adminService.listSellers(query.status) };
  }

  @Post('sellers')
  @RequirePermission('sellers:write')
  @ApiOperation({ summary: 'Onboard a seller + first seller user' })
  async createSeller(@Body() body: CreateSellerDto): Promise<Envelope<AdminSellerDto>> {
    return { data: await this.adminService.createSeller(body) };
  }

  @Patch('sellers/:id')
  @RequirePermission('sellers:write', 'sellers:verify')
  @ApiOperation({ summary: 'Approve / verify / suspend a seller' })
  async updateSeller(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminUpdateSellerDto,
  ): Promise<Envelope<AdminSellerDto>> {
    return { data: await this.adminService.updateSeller(id, body) };
  }

  @Get('inquiries')
  @RequirePermission('inquiries:read')
  @ApiOperation({ summary: 'Latest inquiries across all sellers' })
  async listInquiries(): Promise<Envelope<AdminInquiryDto[]>> {
    return { data: await this.adminService.listInquiries() };
  }

  @Get('overview')
  @RequirePermission('overview:read')
  @ApiOperation({ summary: 'Platform-wide stats' })
  async getOverview(): Promise<Envelope<PlatformOverviewDto>> {
    return { data: await this.adminService.getOverview() };
  }
}
