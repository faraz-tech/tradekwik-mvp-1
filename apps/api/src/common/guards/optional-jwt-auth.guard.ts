import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never rejects: req.user is set when a valid token is
 * present and left undefined otherwise. Used by public forms so a logged-in
 * buyer's inquiry/order gets linked to their account.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(_err: unknown, user: TUser | false): TUser {
    return (user || undefined) as TUser;
  }
}
