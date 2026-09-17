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
import { createOrderRequestSchema, createdResourceSchema } from '@tradekwik/shared';
import { OrderRequestsService } from './order-requests.service.js';

class CreateOrderRequestDto extends createZodDto(createOrderRequestSchema) {}
class CreatedResponseDto extends createZodDto(z.object({ data: createdResourceSchema })) {}

@ApiTags('public')
@Controller('order-requests')
@UseGuards(ThrottlerGuard)
export class OrderRequestsController {
  constructor(private readonly orderRequestsService: OrderRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Place an order/booking request (rate-limited)' })
  @ApiCreatedResponse({ type: CreatedResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or seller unavailable' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(@Body() body: CreateOrderRequestDto): Promise<CreatedResponseDto> {
    return { data: await this.orderRequestsService.create(body) };
  }
}
