import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { ISagaStepHandler } from '@shared/domain/saga';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';

@Injectable()
export class GenerateRefreshTokensStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(ctx: RefreshSessionSagaContext): Promise<void> {
    if (!ctx.user) throw new Error('GenerateRefreshTokensStep: ctx.user not set by prior step');
    if (!ctx.email) throw new Error('GenerateRefreshTokensStep: ctx.email not set by prior step');

    const payload = { sub: ctx.user.uuid, email: ctx.email };

    const accessExpiration = (this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
      '15m') as StringValue;
    const refreshExpiration = (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
      '7d') as StringValue;

    const accessOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiration,
    };
    const refreshOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiration,
    };

    ctx.accessToken = await this.jwtService.signAsync(payload, accessOptions);
    ctx.newRefreshToken = await this.jwtService.signAsync(payload, refreshOptions);
  }
}
