import { SetMetadata } from '@nestjs/common';
import type { AdminPermission, SellerPermission } from '@tradekwik/shared';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require one of the listed permissions (any match passes).
 * Seller routes use SellerPermission values, admin routes AdminPermission values.
 */
export const RequirePermission = (...permissions: Array<SellerPermission | AdminPermission>) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
