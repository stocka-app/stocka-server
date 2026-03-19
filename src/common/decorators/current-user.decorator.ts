import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  uuid: string;
  email: string;
  tenantId: string | null;
  role: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new Error('User not found in request. Ensure JwtAuthenticationGuard is applied.');
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
