import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a controller/route to the given JWT roles (use with RolesGuard). */
export const Roles = (...roles: Array<'seller' | 'admin'>) => SetMetadata(ROLES_KEY, roles);
