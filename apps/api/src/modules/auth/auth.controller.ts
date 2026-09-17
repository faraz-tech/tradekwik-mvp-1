import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { Response } from 'express';
import {
  adminLoginSchema,
  authUserSchema,
  loginResponseSchema,
  sellerLoginSchema,
  type LoginResponseDto,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from './jwt-payload.js';
import { AuthService } from './auth.service.js';

class SellerLoginDto extends createZodDto(sellerLoginSchema) {}
class AdminLoginDto extends createZodDto(adminLoginSchema) {}
class LoginResponseWrapperDto extends createZodDto(z.object({ data: loginResponseSchema })) {}
class MeResponseDto extends createZodDto(z.object({ data: authUserSchema })) {}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('seller/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Seller login (phone + password) — sets httpOnly cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  @ApiUnauthorizedResponse({ description: 'Bad credentials or store not active' })
  async sellerLogin(
    @Body() body: SellerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.loginSeller(body);
    setAuthCookie(res, result.token);
    return { data: result };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Platform admin login (email + password) — sets httpOnly cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  @ApiUnauthorizedResponse({ description: 'Bad credentials' })
  async adminLogin(
    @Body() body: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.loginAdmin(body);
    setAuthCookie(res, result.token);
    return { data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the auth cookie' })
  logout(@Res({ passthrough: true }) res: Response): { data: { ok: true } } {
    res.clearCookie('token', { path: '/' });
    return { data: { ok: true } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return { data: await this.authService.getMe(user) };
  }
}
