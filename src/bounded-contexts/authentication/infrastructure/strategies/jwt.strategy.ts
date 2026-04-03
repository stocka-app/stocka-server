import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtTierLimits {
  tier: string;
  maxCustomRooms: number;
  maxStoreRooms: number;
  maxWarehouses: number;
}

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: string | null;
  tierLimits: JwtTierLimits | null;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: unknown): {
    uuid: string;
    email: string;
    tenantId: string | null;
    role: string | null;
    tierLimits: JwtTierLimits | null;
  } {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as JwtPayload).sub !== 'string' ||
      !(payload as JwtPayload).sub ||
      typeof (payload as JwtPayload).email !== 'string' ||
      !(payload as JwtPayload).email
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const typed = payload as JwtPayload;

    return {
      uuid: typed.sub,
      email: typed.email,
      tenantId: typed.tenantId ?? null,
      role: typed.role ?? null,
      tierLimits: typed.tierLimits ?? null,
    };
  }
}
