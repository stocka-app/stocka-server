import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

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

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get credential by user UUID to check email verification status
    const result = await this.mediator.user.findUserByUUIDWithCredential(user.sub);

    if (!result) {
      throw new ForbiddenException('User not found');
    }

    // Check if user's email is verified via credential
    if (result.credential.requiresEmailVerification()) {
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
