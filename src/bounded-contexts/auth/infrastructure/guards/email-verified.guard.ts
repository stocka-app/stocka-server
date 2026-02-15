import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserModel } from '@user/domain/models/user.model';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly mediator: MediatorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route should skip email verification
    const skipVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { sub?: string } }>();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get full user from database to check status
    const fullUser = (await this.mediator.findUserByUUID(user.sub)) as UserModel | null;

    if (!fullUser) {
      throw new ForbiddenException('User not found');
    }

    // Check if user's email is verified
    if (fullUser.status && fullUser.status.requiresEmailVerification()) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Email Not Verified',
        message: 'Please verify your email address to access this resource',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return true;
  }
}
