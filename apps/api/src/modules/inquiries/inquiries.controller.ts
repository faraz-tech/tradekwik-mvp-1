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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { OptionalUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { InquiriesService } from './inquiries.service.js';

class CreateInquiryDto extends createZodDto(createInquirySchema) {}
class CreatedResponseDto extends createZodDto(z.object({ data: createdResourceSchema })) {}

@ApiTags('public')
@Controller('inquiries')
@UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send an inquiry to a seller (rate-limited; linked to the buyer when logged in)',
  })
  @ApiCreatedResponse({ type: CreatedResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or seller/product unavailable' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(
    @Body() body: CreateInquiryDto,
    @OptionalUser() user: JwtPayload | undefined,
  ): Promise<CreatedResponseDto> {
    const buyerId = user?.role === 'buyer' ? user.sub : null;
    return { data: await this.inquiriesService.create(body, buyerId) };
  }
}
