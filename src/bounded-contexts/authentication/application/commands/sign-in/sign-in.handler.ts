import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { SignInCommand } from '@authentication/application/commands/sign-in/sign-in.command';
import { SignInCommandResult } from '@authentication/application/types/authentication-result.types';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { SessionModel } from '@authentication/domain/models/session.model';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@authentication/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@authentication/domain/exceptions/email-not-verified.exception';
import { SocialAccountRequiredException } from '@authentication/domain/exceptions/social-account-required.exception';
import { UserSignedInEvent } from '@authentication/domain/events/user-signed-in.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IPersistedUserView } from '@shared/domain/contracts/user-view.contract';
import { ok, err } from '@shared/domain/result';

@CommandHandler(SignInCommand)
export class SignInHandler implements ICommandHandler<SignInCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: SignInCommand): Promise<SignInCommandResult> {
    const user = await this.mediator.user.findByEmailOrUsername(command.emailOrUsername);

    if (!user) {
      return err(new InvalidCredentialsException());
    }

    if (!user.passwordHash) {
      return err(new InvalidCredentialsException());
    }

    const isPasswordValid = await AuthenticationDomainService.comparePasswords(
      command.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return err(new InvalidCredentialsException());
    }

    if (user.isArchived()) {
      return err(new AccountDeactivatedException());
    }

    if (user.isFlexiblePending()) {
      return err(new SocialAccountRequiredException());
    }

    if (user.isPendingVerification()) {
      return err(new EmailNotVerifiedException());
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    const session = await this.createSession(user.id, refreshToken);

    this.eventPublisher.mergeObjectContext(session);
    session.commit();

    this.eventBus.publish(new UserSignedInEvent(user.uuid));

    return ok({
      user,
      accessToken,
      refreshToken,
      emailVerificationRequired: false,
    });
  }

  private async generateTokens(
    user: IPersistedUserView,
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
    const tokenHash = AuthenticationDomainService.hashToken(refreshToken);
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
