import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
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
  buyerLoginSchema,
  buyerRegisterSchema,
  loginResponseSchema,
  sellerLoginSchema,
  sellerRegisterResponseSchema,
  sellerRegisterSchema,
  type LoginResponseDto,
  type SellerRegisterResponseDto,
} from '@tradekwik/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AUTH_COOKIE, BUYER_COOKIE, type JwtPayload } from './jwt-payload.js';
import { AuthService } from './auth.service.js';

class SellerLoginDto extends createZodDto(sellerLoginSchema) {}
class AdminLoginDto extends createZodDto(adminLoginSchema) {}
class BuyerRegisterDto extends createZodDto(buyerRegisterSchema) {}
class BuyerLoginDto extends createZodDto(buyerLoginSchema) {}
class SellerRegisterDto extends createZodDto(sellerRegisterSchema) {}
class SellerRegisterResponseWrapperDto extends createZodDto(z.object({ data: sellerRegisterResponseSchema })) {}
class LoginResponseWrapperDto extends createZodDto(z.object({ data: loginResponseSchema })) {}
class MeResponseDto extends createZodDto(z.object({ data: authUserSchema })) {}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, name: string, token: string): void {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
    // prod: set COOKIE_DOMAIN=.tradekwik.com so admin.tradekwik.com sees the cookie
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

const loginThrottle = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('seller/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(loginThrottle)
  @ApiOperation({ summary: 'Seller login (phone + password) — sets httpOnly cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  @ApiUnauthorizedResponse({ description: 'Bad credentials or store not active' })
  async sellerLogin(
    @Body() body: SellerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.loginSeller(body);
    setAuthCookie(res, AUTH_COOKIE, result.token);
    return { data: result };
  }

  @Post('seller/register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Seller self sign-up — store is created as pending until an admin approves it' })
  @ApiOkResponse({ type: SellerRegisterResponseWrapperDto })
  async sellerRegister(@Body() body: SellerRegisterDto): Promise<{ data: SellerRegisterResponseDto }> {
    return { data: await this.authService.registerSeller(body) };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(loginThrottle)
  @ApiOperation({ summary: 'Platform admin login (email + password) — sets httpOnly cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  @ApiUnauthorizedResponse({ description: 'Bad credentials' })
  async adminLogin(
    @Body() body: AdminLoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.loginAdmin(body, ip);
    setAuthCookie(res, AUTH_COOKIE, result.token);
    return { data: result };
  }

  @Get('admin/access')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Admin login availability for this IP (404 unless allow-listed)' })
  async adminAccess(@Ip() ip: string): Promise<{ data: { allowed: true } }> {
    await this.authService.assertAdminIp(ip);
    return { data: { allowed: true } };
  }

  @Post('buyer/register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle(loginThrottle)
  @ApiOperation({ summary: 'Buyer sign-up (phone + password) — sets httpOnly buyer cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  async buyerRegister(
    @Body() body: BuyerRegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.registerBuyer(body);
    setAuthCookie(res, BUYER_COOKIE, result.token);
    return { data: result };
  }

  @Post('buyer/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(loginThrottle)
  @ApiOperation({ summary: 'Buyer login (phone + password) — sets httpOnly buyer cookie' })
  @ApiOkResponse({ type: LoginResponseWrapperDto })
  @ApiUnauthorizedResponse({ description: 'Bad credentials' })
  async buyerLogin(
    @Body() body: BuyerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authService.loginBuyer(body);
    setAuthCookie(res, BUYER_COOKIE, result.token);
    return { data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the seller/admin auth cookie' })
  logout(@Res({ passthrough: true }) res: Response): { data: { ok: true } } {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    return { data: { ok: true } };
  }

  @Post('buyer/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the buyer auth cookie' })
  buyerLogout(@Res({ passthrough: true }) res: Response): { data: { ok: true } } {
    res.clearCookie(BUYER_COOKIE, { path: '/' });
    return { data: { ok: true } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('token')
  @ApiOperation({ summary: 'Current authenticated seller/admin user' })
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return { data: await this.authService.getMe(user) };
  }

  @Get('buyer/me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('buyer_token')
  @ApiOperation({ summary: 'Current authenticated buyer' })
  @ApiOkResponse({ type: MeResponseDto })
  async buyerMe(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return { data: await this.authService.getMe(user) };
  }
}
