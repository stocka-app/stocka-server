import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ISagaStepHandler } from '@shared/domain/saga';
import { ISessionContract } from '@user/account/session/domain/session.contract';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { RefreshSessionSagaContext } from '@authentication/application/sagas/refresh-session/refresh-session.saga-context';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

interface JwtPayload {
  sub: string;
  email: string;
}

function isValidJwtPayload(decoded: unknown): decoded is JwtPayload {
  return (
    typeof decoded === 'object' &&
    decoded !== null &&
    'sub' in decoded &&
    typeof (decoded as JwtPayload).sub === 'string'
  );
}

@Injectable()
export class ValidateRefreshTokenStep implements ISagaStepHandler<RefreshSessionSagaContext> {
  constructor(
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mediator: MediatorService,
  ) {}

  async execute(ctx: RefreshSessionSagaContext): Promise<void> {
    const tokenHash = AuthenticationDomainService.hashToken(ctx.refreshToken);
    const session = await this.sessionContract.findByTokenHash(tokenHash);

    if (!session?.isValid()) {
      throw new TokenExpiredException();
    }

    /* istanbul ignore next */
    try {
      await this.jwtService.verifyAsync(ctx.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new TokenExpiredException();
    }

    const decoded: unknown = this.jwtService.decode(ctx.refreshToken);
    /* istanbul ignore next */
    if (!isValidJwtPayload(decoded)) {
      throw new TokenExpiredException();
    }

    const user = await this.mediator.user.findByUUID(decoded.sub);
    /* istanbul ignore next */
    if (!user) {
      throw new TokenExpiredException();
    }

    ctx.oldSessionUUID = session.uuid;
    ctx.accountId = session.accountId;
    ctx.user = user;
    ctx.email = decoded.email;
  }
}
