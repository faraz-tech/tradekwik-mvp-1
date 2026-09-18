import { createParamDecorator, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/jwt-payload.js';

/** The full JWT payload of the authenticated user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload;
  },
);

/** JWT payload if present, else undefined (use with OptionalJwtAuthGuard). */
export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as JwtPayload | undefined;
  },
);

/**
 * The seller_id from the token — the ONLY source of tenant scoping.
 * Never accept a client-sent seller id.
 */
export const CurrentSeller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;
    if (!user?.sellerId) {
      throw new ForbiddenException('Seller account required.');
    }
    return user.sellerId;
  },
);

/** The buyer id from a buyer token. */
export const CurrentBuyer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;
    if (!user || user.role !== 'buyer') {
      throw new ForbiddenException('Buyer account required.');
    }
    return user.sub;
  },
);
