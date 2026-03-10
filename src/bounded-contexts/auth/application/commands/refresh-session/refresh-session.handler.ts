import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { RefreshSessionCommand } from '@auth/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionCommandResult } from '@auth/application/types/auth-result.types';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { SessionModel } from '@auth/domain/models/session.model';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { TokenExpiredException } from '@auth/domain/exceptions/token-expired.exception';
import { SessionRefreshedEvent } from '@auth/domain/events/session-refreshed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IUserView } from '@shared/domain/contracts/user-view.contract';
import { ok, err } from '@shared/domain/result';

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

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<RefreshSessionCommandResult> {
    // Hash the token and find the session
    const tokenHash = AuthDomainService.hashToken(command.refreshToken);
    const session = await this.sessionContract.findByTokenHash(tokenHash);

    // Check if session exists and is valid
    if (!session?.isValid()) {
      return err(new TokenExpiredException());
    }

    // Verify the JWT token is valid
    try {
      await this.jwtService.verifyAsync(command.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return err(new TokenExpiredException());
    }

    // Get the user
    const decoded: unknown = this.jwtService.decode(command.refreshToken);
    if (!isValidJwtPayload(decoded)) {
      return err(new TokenExpiredException());
    }
    const user = await this.mediator.user.findByUUID(decoded.sub);

    if (!user) {
      return err(new TokenExpiredException());
    }

    // Archive the old session
    const oldSessionUUID = session.uuid;
    await this.sessionContract.archive(session.uuid);

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    // Create new session
    const newSession = await this.createSession(user.id!, refreshToken);

    // Publish events
    this.eventPublisher.mergeObjectContext(newSession);
    newSession.commit();
    this.eventBus.publish(new SessionRefreshedEvent(oldSessionUUID, newSession.uuid));

    return ok({ accessToken, refreshToken });
  }

  private async generateTokens(
    user: IUserView,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.uuid, email: user.email };

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

    const accessToken = await this.jwtService.signAsync(payload, accessOptions);
    const refreshToken = await this.jwtService.signAsync(payload, refreshOptions);

    return { accessToken, refreshToken };
  }

  private async createSession(userId: number, refreshToken: string): Promise<SessionModel> {
    const tokenHash = AuthDomainService.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = SessionModel.create({
      userId,
      tokenHash,
      expiresAt,
    });

    await this.sessionContract.persist(session);
    return session;
  }
}
