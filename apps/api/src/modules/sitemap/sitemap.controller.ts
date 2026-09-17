import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sitemapDataSchema } from '@tradekwik/shared';
import { SitemapService } from './sitemap.service.js';

class SitemapResponseDto extends createZodDto(z.object({ data: sitemapDataSchema })) {}

@ApiTags('public')
@Controller('sitemap-data')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get()
  @ApiOperation({ summary: 'Slugs + updated_at for the storefront sitemap' })
  @ApiOkResponse({ type: SitemapResponseDto })
  async getData(): Promise<SitemapResponseDto> {
    return { data: await this.sitemapService.getData() };
  }
}
