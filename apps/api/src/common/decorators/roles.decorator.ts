import { SetMetadata } from '@nestjs/common';
import type { PrincipalRole } from '../../modules/auth/jwt-payload.js';

export const ROLES_KEY = 'roles';

/** Restrict a controller/route to the given JWT roles (use with RolesGuard). */
export const Roles = (...roles: PrincipalRole[]) => SetMetadata(ROLES_KEY, roles);
