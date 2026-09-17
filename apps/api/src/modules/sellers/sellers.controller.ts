import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  productWithSellerSchema,
  publicProductSchema,
  publicSellerSchema,
} from '@tradekwik/shared';
import { SellersService } from './sellers.service.js';

class SellerProfileResponseDto extends createZodDto(
  z.object({ data: publicSellerSchema }),
) {}
class SellerProductListResponseDto extends createZodDto(
  z.object({ data: z.array(publicProductSchema) }),
) {}
class ProductDetailResponseDto extends createZodDto(
  z.object({ data: productWithSellerSchema }),
) {}

@ApiTags('public')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Public store profile' })
  @ApiParam({ name: 'slug', example: 'shakti-embroidery-machines' })
  @ApiOkResponse({ type: SellerProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found or not active' })
  async getProfile(@Param('slug') slug: string): Promise<SellerProfileResponseDto> {
    return { data: await this.sellersService.getProfile(slug) };
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Published products of a store' })
  @ApiParam({ name: 'slug', example: 'shakti-embroidery-machines' })
  @ApiOkResponse({ type: SellerProductListResponseDto })
  async getProducts(@Param('slug') slug: string): Promise<SellerProductListResponseDto> {
    return { data: await this.sellersService.getProducts(slug) };
  }

  @Get(':slug/products/:productSlug')
  @ApiOperation({ summary: 'Product detail (with seller card)' })
  @ApiParam({ name: 'slug', example: 'shakti-embroidery-machines' })
  @ApiParam({ name: 'productSlug', example: 'aari-embroidery-machine-single-head' })
  @ApiOkResponse({ type: ProductDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Store or product not found' })
  async getProduct(
    @Param('slug') slug: string,
    @Param('productSlug') productSlug: string,
  ): Promise<ProductDetailResponseDto> {
    return { data: await this.sellersService.getProduct(slug, productSlug) };
  }
}
