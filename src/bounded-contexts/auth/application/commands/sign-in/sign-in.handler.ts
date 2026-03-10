import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { SignInCommand } from '@auth/application/commands/sign-in/sign-in.command';
import { SignInCommandResult } from '@auth/application/types/auth-result.types';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { SessionModel } from '@auth/domain/models/session.model';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { InvalidCredentialsException } from '@auth/domain/exceptions/invalid-credentials.exception';
import { AccountDeactivatedException } from '@auth/domain/exceptions/account-deactivated.exception';
import { EmailNotVerifiedException } from '@auth/domain/exceptions/email-not-verified.exception';
import { SocialAccountRequiredException } from '@auth/domain/exceptions/social-account-required.exception';
import { UserSignedInEvent } from '@auth/domain/events/user-signed-in.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserAggregate } from '@user/domain/models/user.aggregate';
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
    const user = (await this.mediator.findUserByEmailOrUsername(
      command.emailOrUsername,
    )) as UserAggregate | null;

    if (!user) {
      return err(new InvalidCredentialsException());
    }

    if (!user.hasPassword()) {
      return err(new InvalidCredentialsException());
    }

    const isPasswordValid = await AuthDomainService.comparePasswords(
      command.password,
      user.passwordHash!,
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

    if (user.status.isPendingVerification()) {
      return err(new EmailNotVerifiedException());
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    const session = await this.createSession(user.id!, refreshToken);

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
    user: UserAggregate,
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
