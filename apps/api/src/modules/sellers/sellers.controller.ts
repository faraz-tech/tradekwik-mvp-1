import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  productWithSellerSchema,
  publicProductSchema,
  publicSellerAboutSchema,
  publicSellerSchema,
  storeProductsMetaSchema,
  storeProductsQuerySchema,
} from '@tradekwik/shared';
import { SellersService } from './sellers.service.js';

class SellerProfileResponseDto extends createZodDto(
  z.object({ data: publicSellerSchema }),
) {}
class SellerAboutResponseDto extends createZodDto(z.object({ data: publicSellerAboutSchema })) {}
class StoreProductsQueryDto extends createZodDto(storeProductsQuerySchema) {}
class SellerProductListResponseDto extends createZodDto(
  z.object({ data: z.array(publicProductSchema), meta: storeProductsMetaSchema }),
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

  @Get(':slug/about')
  @ApiOperation({ summary: 'Company details, process, social links and owners (About page)' })
  @ApiParam({ name: 'slug', example: 'shakti-embroidery-machines' })
  @ApiOkResponse({ type: SellerAboutResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found or not active' })
  async getAbout(@Param('slug') slug: string): Promise<SellerAboutResponseDto> {
    return { data: await this.sellersService.getAbout(slug) };
  }

  @Get(':slug/products')
  @ApiOperation({
    summary: 'Published products of a store (paginated; filter by listing type / text; sort)',
  })
  @ApiParam({ name: 'slug', example: 'shakti-embroidery-machines' })
  @ApiOkResponse({ type: SellerProductListResponseDto })
  async getProducts(
    @Param('slug') slug: string,
    @Query() query: StoreProductsQueryDto,
  ): Promise<SellerProductListResponseDto> {
    const { items, ...meta } = await this.sellersService.getProducts(slug, query);
    return { data: items, meta };
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
