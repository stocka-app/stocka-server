import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { ISagaStepHandler } from '@shared/domain/saga';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';

@Injectable()
export class GenerateRefreshTokensStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mediator: MediatorService,
  ) {}

  async execute(ctx: RefreshSessionSagaContext): Promise<void> {
    /* istanbul ignore next */
    if (!ctx.user) throw new Error('GenerateRefreshTokensStep: ctx.user not set by prior step');
    /* istanbul ignore next */
    if (!ctx.email) throw new Error('GenerateRefreshTokensStep: ctx.email not set by prior step');

    const [membership, tierLimits, displayName, socialName, onboardingStatus, username] =
      await Promise.all([
        this.mediator.tenant.getActiveMembership(ctx.user.uuid),
        this.mediator.tenant.getTierLimits(ctx.user.uuid),
        this.mediator.user.findDisplayNameByUserUUID(ctx.user.uuid),
        this.mediator.user.findSocialNameByUserUUID(ctx.user.uuid),
        this.mediator.onboarding.getOnboardingStatus(ctx.user.uuid),
        this.mediator.user.findUsernameByUUID(ctx.user.uuid),
      ]);

    const payload = {
      sub: ctx.user.uuid,
      email: ctx.email,
      tenantId: membership?.tenantUUID ?? null,
      role: membership?.role ?? null,
      displayName,
      tierLimits: tierLimits ?? null,
    };

    /* istanbul ignore next */
    const accessExpiration = (this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
      '15m') as StringValue;
    /* istanbul ignore next */
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
    ctx.newRefreshToken = await this.jwtService.signAsync(payload, refreshOptions);

    // Enrichment data for the response
    /* istanbul ignore next */
    ctx.username = username ?? undefined;
    ctx.givenName = socialName.givenName;
    ctx.familyName = socialName.familyName;
    ctx.avatarUrl = socialName.avatarUrl;
    ctx.onboardingStatus = onboardingStatus;
  }
}
