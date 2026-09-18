import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  ADMIN_ROLE_PERMISSIONS,
  SELLER_ROLE_PERMISSIONS,
  type AdminPermission,
  type SellerPermission,
} from '@tradekwik/shared';
import type { JwtPayload } from '../../modules/auth/jwt-payload.js';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

/** Resolve the permission set of a JWT principal from the shared matrix. */
export function permissionsOf(user: JwtPayload): ReadonlySet<string> {
  if (user.role === 'seller') {
    return new Set(SELLER_ROLE_PERMISSIONS[user.sellerUserRole ?? 'staff'] ?? []);
  }
  if (user.role === 'admin') {
    return new Set(ADMIN_ROLE_PERMISSIONS[user.adminRole ?? 'super_admin'] ?? []);
  }
  return new Set();
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Array<SellerPermission | AdminPermission>>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException('Please log in to continue.');

    const granted = permissionsOf(user);
    if (!required.some((permission) => granted.has(permission))) {
      throw new ForbiddenException('Your role does not allow this action.');
    }
    return true;
  }
}
