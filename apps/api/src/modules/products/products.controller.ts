import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { productSearchQuerySchema, productWithSellerSchema } from '@tradekwik/shared';
import { ProductsService } from './products.service.js';

class ProductSearchQueryDto extends createZodDto(productSearchQuerySchema) {}

class ProductSearchResponseDto extends createZodDto(
  z.object({
    data: z.array(productWithSellerSchema),
    meta: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
    }),
  }),
) {}

@ApiTags('public')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Search/browse products across all stores' })
  @ApiOkResponse({ type: ProductSearchResponseDto })
  async search(@Query() query: ProductSearchQueryDto): Promise<ProductSearchResponseDto> {
    const { items, page, pageSize, total } = await this.productsService.search(query);
    return { data: items, meta: { page, pageSize, total } };
  }
}
