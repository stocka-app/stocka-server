import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Global JWT guard that runs BEFORE PermissionGuard so that request.user is populated
 * for all requests that carry a valid Bearer token.
 *
 * Unlike JwtAuthenticationGuard, this guard NEVER throws — missing or invalid tokens
 * are silently ignored and request.user is left undefined. Per-route enforcement is
 * handled downstream by:
 *   - PermissionGuard (global): throws 401 when @RequireAction is set but user is absent
 *   - JwtAuthenticationGuard (local, via @UseGuards): throws 401 for routes that require auth
 *     but do not use @RequireAction (e.g. GET /users/me)
 */
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    // Delegate to AuthGuard('jwt') but suppress any thrown errors.
    // If the token is missing or invalid, the base class calls handleRequest
    // which we override to return null instead of throwing.
    return super.canActivate(context) as Promise<boolean> | boolean;
  }

  override handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    // Return the user if valid; return null for missing/invalid tokens.
    // Never throw — let downstream guards decide whether authentication is required.
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
