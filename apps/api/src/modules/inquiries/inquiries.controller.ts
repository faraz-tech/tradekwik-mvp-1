import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createInquirySchema, createdResourceSchema } from '@tradekwik/shared';
import { InquiriesService } from './inquiries.service.js';

class CreateInquiryDto extends createZodDto(createInquirySchema) {}
class CreatedResponseDto extends createZodDto(z.object({ data: createdResourceSchema })) {}

@ApiTags('public')
@Controller('inquiries')
@UseGuards(ThrottlerGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send an inquiry to a seller (rate-limited)' })
  @ApiCreatedResponse({ type: CreatedResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or seller/product unavailable' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(@Body() body: CreateInquiryDto): Promise<CreatedResponseDto> {
    return { data: await this.inquiriesService.create(body) };
  }
}
