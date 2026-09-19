import { Body, Controller, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  sendOtpResponseSchema,
  sendOtpSchema,
  verifyOtpResponseSchema,
  verifyOtpSchema,
  type SendOtpResponseDto,
  type VerifyOtpResponseDto,
} from '@tradekwik/shared';
import { OtpService } from './otp.service.js';

class SendOtpDto extends createZodDto(sendOtpSchema) {}
class VerifyOtpDto extends createZodDto(verifyOtpSchema) {}
class SendOtpResponseWrapperDto extends createZodDto(z.object({ data: sendOtpResponseSchema })) {}
class VerifyOtpResponseWrapperDto extends createZodDto(z.object({ data: verifyOtpResponseSchema })) {}

@ApiTags('auth')
@Controller('auth/otp')
@UseGuards(ThrottlerGuard)
export class OtpController {
  constructor(private readonly otp: OtpService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a 6-digit OTP to a mobile number (daily per-number and per-IP caps apply)' })
  @ApiOkResponse({ type: SendOtpResponseWrapperDto })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async send(@Body() body: SendOtpDto, @Ip() ip: string): Promise<{ data: SendOtpResponseDto }> {
    return { data: await this.otp.send(body, ip || null) };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify an OTP; returns a 15-minute token to pass as otpToken when registering' })
  @ApiOkResponse({ type: VerifyOtpResponseWrapperDto })
  async verify(@Body() body: VerifyOtpDto): Promise<{ data: VerifyOtpResponseDto }> {
    return { data: await this.otp.verify(body) };
  }
}
