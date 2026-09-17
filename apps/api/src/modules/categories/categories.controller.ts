import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { categorySchema } from '@tradekwik/shared';
import { CategoriesService } from './categories.service.js';

class CategoryListResponseDto extends createZodDto(
  z.object({ data: z.array(categorySchema) }),
) {}

@ApiTags('public')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  @ApiOkResponse({ type: CategoryListResponseDto })
  async findAll(): Promise<CategoryListResponseDto> {
    return { data: await this.categoriesService.findAll() };
  }
}
