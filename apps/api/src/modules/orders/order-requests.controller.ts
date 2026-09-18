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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { OptionalUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { OrderRequestsService } from './order-requests.service.js';

class CreateOrderRequestDto extends createZodDto(createOrderRequestSchema) {}
class CreatedResponseDto extends createZodDto(z.object({ data: createdResourceSchema })) {}

@ApiTags('public')
@Controller('order-requests')
@UseGuards(ThrottlerGuard, OptionalJwtAuthGuard)
export class OrderRequestsController {
  constructor(private readonly orderRequestsService: OrderRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Place an order/booking request (rate-limited; linked to the buyer when logged in)' })
  @ApiCreatedResponse({ type: CreatedResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or seller unavailable' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async create(
    @Body() body: CreateOrderRequestDto,
    @OptionalUser() user: JwtPayload | undefined,
  ): Promise<CreatedResponseDto> {
    const buyerId = user?.role === 'buyer' ? user.sub : null;
    return { data: await this.orderRequestsService.create(body, buyerId) };
  }
}
