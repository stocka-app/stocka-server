import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@common/decorators/current-user.decorator';

interface JwtAccessPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: string | null;
  tierLimits: JwtPayload['tierLimits'] | undefined;
}

@Injectable()
export class JwtValidator {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  validate(context: ExecutionContext): JwtPayload {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ error: 'NOT_AUTHENTICATED' });
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify<JwtAccessPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      const user: JwtPayload = {
        uuid: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId ?? null,
        role: payload.role ?? null,
        tierLimits: payload.tierLimits ?? null,
      };

      request.user = user;
      return user;
    } catch {
      throw new UnauthorizedException({ error: 'INVALID_TOKEN' });
    }
  }
}
