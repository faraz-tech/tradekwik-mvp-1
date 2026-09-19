import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { BillingService } from './billing.service.js';

/**
 * Blocks seller *mutations* (POST/PATCH/PUT/DELETE) when the trial or plan has lapsed.
 * Reads stay open so the seller can still see their data and the Billing page.
 * Order/shipment updates are also blocked — a lapsed seller should renew before dispatching.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly billing: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET' || request.method === 'HEAD') return true;
    const user = request.user as JwtPayload | undefined;
    if (!user?.sellerId) return true; // other guards handle auth
    await this.billing.assertCanWrite(user.sellerId);
    return true;
  }
}
