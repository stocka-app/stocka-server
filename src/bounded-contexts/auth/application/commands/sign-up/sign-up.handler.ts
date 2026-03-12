import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { SignUpCommand } from '@auth/application/commands/sign-up/sign-up.command';
import { SignUpCommandResult } from '@auth/application/types/auth-result.types';
import { PasswordVO } from '@auth/domain/value-objects/password.vo';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { SessionModel } from '@auth/domain/models/session.model';
import { EmailVerificationTokenModel } from '@auth/domain/models/email-verification-token.model';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';
import { IUnitOfWork } from '@shared/domain/contracts/unit-of-work.contract';
import { EmailAlreadyExistsException } from '@auth/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@auth/domain/exceptions/username-already-exists.exception';
import { UserSignedUpEvent } from '@auth/domain/events/user-signed-up.event';
import { EmailVerificationRequestedEvent } from '@auth/domain/events/email-verification-requested.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { IUserView } from '@shared/domain/contracts/user-view.contract';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from '@shared/domain/result';

@CommandHandler(SignUpCommand)
export class SignUpHandler implements ICommandHandler<SignUpCommand> {
  private readonly logger = new Logger(SignUpHandler.name);

  constructor(
    private readonly mediator: MediatorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly verificationTokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
    @Inject(INJECTION_TOKENS.UNIT_OF_WORK)
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(command: SignUpCommand): Promise<SignUpCommandResult> {
    // 1. Validate password format
    try {
      new PasswordVO(command.password);
    } catch (e) {
      if (e instanceof DomainException) return err(e);
      throw e;
    }

    // 2. Check if email/username already exist
    const existingUser = await this.mediator.user.findByEmail(command.email);
    if (existingUser) {
      return err(new EmailAlreadyExistsException());
    }

    const usernameExists = await this.mediator.user.existsByUsername(command.username);
    if (usernameExists) {
      return err(new UsernameAlreadyExistsException());
    }

    // 3. Prepare data before transaction
    const passwordHash = await AuthDomainService.hashPassword(command.password);
    const verificationCode = this.codeGenerator.generateVerificationCode();

    // 4. Persist everything atomically in a single transaction
    let user: IUserView;
    let session: SessionModel;
    let accessToken: string;
    let refreshToken: string;

    await this.uow.begin();
    try {
      const manager = this.uow.getManager();

      user = await this.mediator.user.createUser(
        command.email,
        command.username,
        passwordHash,
        manager,
      );

      ({ accessToken, refreshToken } = await this.generateTokens(user));

      session = this.buildSession(user.id!, refreshToken);
      await this.sessionContract.persist(session, manager);

      const token = this.buildVerificationToken(user, verificationCode);
      await this.verificationTokenContract.persist(token, manager);

      await this.uow.commit();
    } catch (error) {
      await this.uow.rollback();
      this.logger.error(`Sign-up transaction failed: ${error}`);
      throw error;
    }

    // 5. Publish events AFTER commit — email sent reactively by EventHandler
    this.eventBus.publish(new UserSignedUpEvent(user.uuid, user.email));
    this.eventBus.publish(
      new EmailVerificationRequestedEvent(
        user.id!,
        user.email,
        verificationCode,
        user.username,
        command.lang,
      ),
    );

    return ok({
      user,
      accessToken,
      refreshToken,
      emailVerificationRequired: true,
    });
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

  private buildSession(userId: number, refreshToken: string): SessionModel {
    const tokenHash = AuthDomainService.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return SessionModel.create({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  private buildVerificationToken(
    user: IUserView,
    code: string,
  ): EmailVerificationTokenModel {
    const codeHash = this.codeGenerator.hashCode(code);
    const expirationMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRATION_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    return EmailVerificationTokenModel.create({
      userId: user.id!,
      codeHash,
      expiresAt,
      email: user.email,
      code,
    });
  }
}
