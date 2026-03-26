import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { ISagaStepHandler } from '@shared/domain/saga';
import { SignUpSagaContext } from '@authentication/application/sagas/sign-up/sign-up.saga-context';

@Injectable()
export class GenerateTokensStep implements ISagaStepHandler<SignUpSagaContext> {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(ctx: SignUpSagaContext): Promise<void> {
    const user = ctx.user;
    if (!user) throw new Error('GenerateTokensStep: ctx.user not set by prior step');
    if (!ctx.credential)
      throw new Error('GenerateTokensStep: ctx.credential not set by prior step');

    const payload = {
      sub: user.uuid,
      email: ctx.credential.email,
      tenantId: null,
      role: null,
      displayName: null,
      tierLimits: null,
    };

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
      jwtid: uuidv4(),
    };

    ctx.accessToken = await this.jwtService.signAsync(payload, accessOptions);
    ctx.refreshToken = await this.jwtService.signAsync(payload, refreshOptions);
  }
}
