import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AUTH_COOKIE, BUYER_COOKIE, type JwtPayload } from './jwt-payload.js';

/** Buyer routes read the buyer cookie first; everything else reads the seller/admin cookie first. */
function isBuyerRoute(req: Request): boolean {
  const path = req.path ?? '';
  return path.includes('/buyer/') || path.endsWith('/buyer') || path.includes('/auth/buyer');
}

function cookieExtractor(req: Request): string | null {
  const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
  const order = isBuyerRoute(req) ? [BUYER_COOKIE, AUTH_COOKIE] : [AUTH_COOKIE, BUYER_COOKIE];
  for (const name of order) {
    if (cookies[name]) return cookies[name] ?? null;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** The returned value becomes req.user. */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
