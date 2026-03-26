import { Injectable } from '@nestjs/common';
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

  validate(payload: JwtPayload): {
    uuid: string;
    email: string;
    tenantId: string | null;
    role: string | null;
    tierLimits: JwtTierLimits | null;
  } {
    return {
      uuid: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId ?? null,
      role: payload.role ?? null,
      tierLimits: payload.tierLimits ?? null,
    };
  }
}
