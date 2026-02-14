import { CommandHandler, ICommandHandler, EventPublisher, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { SignUpCommand } from '@/auth/application/commands/sign-up/sign-up.command';
import { PasswordVO } from '@/auth/domain/value-objects/password.vo';
import { AuthDomainService } from '@/auth/domain/services/auth-domain.service';
import { SessionModel } from '@/auth/domain/models/session.model';
import { EmailVerificationTokenModel } from '@/auth/domain/models/email-verification-token.model';
import { ISessionContract } from '@/auth/domain/contracts/session.contract';
import { IEmailVerificationTokenContract } from '@/auth/domain/contracts/email-verification-token.contract';
import { ICodeGeneratorContract } from '@/shared/domain/contracts/code-generator.contract';
import { IEmailProviderContract } from '@/shared/infrastructure/email/contracts/email-provider.contract';
import { EmailAlreadyExistsException } from '@/auth/domain/exceptions/email-already-exists.exception';
import { UsernameAlreadyExistsException } from '@/auth/domain/exceptions/username-already-exists.exception';
import { EmailDeliveryFailedException } from '@/auth/domain/exceptions/email-delivery-failed.exception';
import { UserSignedUpEvent } from '@/auth/domain/events/user-signed-up.event';
import { MediatorService } from '@/shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@/common/constants/app.constants';
import { UserModel } from '@/user/domain/models/user.model';

interface SignUpResult {
  user: UserModel;
  accessToken: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}

@CommandHandler(SignUpCommand)
export class SignUpHandler implements ICommandHandler<SignUpCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventPublisher: EventPublisher,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
    @Inject(INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT)
    private readonly verificationTokenContract: IEmailVerificationTokenContract,
    @Inject(INJECTION_TOKENS.CODE_GENERATOR_CONTRACT)
    private readonly codeGenerator: ICodeGeneratorContract,
    @Inject(INJECTION_TOKENS.EMAIL_PROVIDER_CONTRACT)
    private readonly emailProvider: IEmailProviderContract,
  ) {}

  async execute(command: SignUpCommand): Promise<SignUpResult> {
    // 1. Validate password format
    new PasswordVO(command.password);

    // 2. Check if email/username already exist
    const existingUser = (await this.mediator.findUserByEmail(command.email)) as UserModel | null;
    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    const usernameExists = await this.mediator.existsUserByUsername(command.username);
    if (usernameExists) {
      throw new UsernameAlreadyExistsException();
    }

    // 3. Generate verification code BEFORE any persistence
    const verificationCode = this.codeGenerator.generateVerificationCode();

    // 4. Send verification email FIRST - if this fails, nothing is persisted
    const emailResult = await this.emailProvider.sendVerificationEmail(
      command.email,
      verificationCode,
      command.username,
    );

    if (!emailResult.success) {
      throw new EmailDeliveryFailedException(emailResult.error);
    }

    // 5. Email sent successfully - now persist everything
    const passwordHash = await AuthDomainService.hashPassword(command.password);

    const user = (await this.mediator.createUser(
      command.email,
      command.username,
      passwordHash,
    )) as UserModel;

    const { accessToken, refreshToken } = await this.generateTokens(user);

    const session = await this.createSession(user.id!, refreshToken);

    // Create email verification token (email already sent, just persist the hash)
    await this.createVerificationToken(user, verificationCode);

    this.eventPublisher.mergeObjectContext(session);
    session.commit();

    // Don't emit EmailVerificationRequestedEvent since email was already sent
    this.eventBus.publish(new UserSignedUpEvent(user.uuid, user.email));

    return {
      user,
      accessToken,
      refreshToken,
      emailVerificationRequired: true,
    };
  }

  private async generateTokens(
    user: UserModel,
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

  private async createVerificationToken(
    user: UserModel,
    code: string,
  ): Promise<EmailVerificationTokenModel> {
    const codeHash = this.codeGenerator.hashCode(code);
    const expirationMinutes = this.configService.get<number>(
      'VERIFICATION_CODE_EXPIRATION_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const token = EmailVerificationTokenModel.create({
      userId: user.id!,
      codeHash,
      expiresAt,
      email: user.email,
      code,
    });

    await this.verificationTokenContract.persist(token);
    return token;
  }
}
