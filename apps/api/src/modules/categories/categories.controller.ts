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
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CATEGORY_REQUEST_STATUSES,
  categorySchema,
  createCategoryRequestSchema,
  createCategorySchema,
  reviewCategoryRequestSchema,
  updateCategorySchema,
  type AdminCategoryDto,
  type CategoryRequestDto,
  type ApiResponse as Envelope,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentSeller } from '../../common/decorators/current-user.decorator.js';
import { CategoriesService } from './categories.service.js';

class CategoryListResponseDto extends createZodDto(z.object({ data: z.array(categorySchema) })) {}
class CreateCategoryDto extends createZodDto(createCategorySchema) {}
class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
class CreateCategoryRequestDto extends createZodDto(createCategoryRequestSchema) {}
class ReviewCategoryRequestDto extends createZodDto(reviewCategoryRequestSchema) {}
class RequestListQueryDto extends createZodDto(
  z.object({ status: z.enum(CATEGORY_REQUEST_STATUSES).optional() }),
) {}

@ApiTags('public')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List active categories' })
  @ApiOkResponse({ type: CategoryListResponseDto })
  async findAll(): Promise<CategoryListResponseDto> {
    return { data: await this.categoriesService.findAll() };
  }
}

@ApiTags('seller')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('seller/category-requests')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('seller')
export class SellerCategoryRequestsController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermission('products:read')
  @ApiOperation({ summary: 'Own category suggestions' })
  async list(@CurrentSeller() sellerId: string): Promise<Envelope<CategoryRequestDto[]>> {
    return { data: await this.categoriesService.listRequests(undefined, sellerId) };
  }

  @Post()
  @RequirePermission('products:write')
  @ApiOperation({ summary: 'Suggest a category that is missing from the list' })
  async create(
    @CurrentSeller() sellerId: string,
    @Body() body: CreateCategoryRequestDto,
  ): Promise<Envelope<CategoryRequestDto>> {
    return { data: await this.categoriesService.createRequest(sellerId, body) };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@ApiCookieAuth('token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermission('categories:manage')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'All categories incl. hidden, with usage counts' })
  async list(): Promise<Envelope<AdminCategoryDto[]>> {
    return { data: await this.categoriesService.adminList() };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category (optional parent, two levels max)' })
  async create(@Body() body: CreateCategoryDto): Promise<Envelope<AdminCategoryDto>> {
    return { data: await this.categoriesService.create(body) };
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Rename / reorder / hide / move a category' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<Envelope<AdminCategoryDto>> {
    return { data: await this.categoriesService.update(id, body) };
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an unused category (in-use ones must be hidden instead)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
  }

  @Get('category-requests')
  @ApiOperation({ summary: 'Category suggestions from sellers' })
  async requests(@Query() query: RequestListQueryDto): Promise<Envelope<CategoryRequestDto[]>> {
    return { data: await this.categoriesService.listRequests(query.status) };
  }

  @Patch('category-requests/:id')
  @ApiOperation({ summary: 'Approve (creates the category) or reject a suggestion' })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReviewCategoryRequestDto,
  ): Promise<Envelope<CategoryRequestDto>> {
    return { data: await this.categoriesService.reviewRequest(id, body) };
  }
}
