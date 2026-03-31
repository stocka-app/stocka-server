import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { Request } from 'express';
import { SecurityRegistry } from '@common/security/security-registry';
import { JwtValidator } from '@common/security/validators/jwt.validator';
import { TenantAccessValidator } from '@common/security/validators/tenant-access.validator';
import { RbacValidator } from '@authorization/infrastructure/validators/rbac.validator';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { TenantMembershipContext } from '@tenant/domain/contracts/tenant-facade.contract';

type RequestWithContext = Request & { membershipContext?: TenantMembershipContext };

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly jwtValidator: JwtValidator,
    private readonly tenantAccessValidator: TenantAccessValidator,
    private readonly rbacValidator: RbacValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const routeKey = this.resolveRouteKey(context);
    const meta = SecurityRegistry[routeKey];

    // Public route — skip all checks
    if (meta?.public === true) return true;

    // JWT check — always required for non-public routes
    const user: JwtPayload = this.jwtValidator.validate(context);

    // Tenant membership + state check
    if (meta?.requireTenant === true || meta?.action !== undefined) {
      const membershipContext = await this.tenantAccessValidator.validate(user);

      // Attach membershipContext to request for @CurrentTenant / @CurrentMember decorators
      const request = context.switchToHttp().getRequest<RequestWithContext>();
      request.membershipContext = membershipContext;

      // RBAC check — pass the already-fetched membership context
      if (meta?.action !== undefined) {
        await this.rbacValidator.validate(user, meta.action, membershipContext);
      }
    }

    return true;
  }

  private resolveRouteKey(context: ExecutionContext): string {
    const controllerPath: string =
      (Reflect.getMetadata('path', context.getClass()) as string | undefined) ?? '';
    const handlerPath: string =
      (Reflect.getMetadata('path', context.getHandler()) as string | undefined) ?? '';
    const methodValue: number = Reflect.getMetadata('method', context.getHandler()) as number;
    const method: string = RequestMethod[methodValue] ?? 'GET';

    const segments = [controllerPath, handlerPath].filter(
      (s): s is string => Boolean(s) && s !== '/',
    );
    const fullPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
    const normalized = fullPath.replace(/\/+/g, '/');

    return `${method} ${normalized}`;
  }
}
