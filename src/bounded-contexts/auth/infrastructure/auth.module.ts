import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { SessionEntity } from '@auth/infrastructure/persistence/entities/session.entity';
import { PasswordResetTokenEntity } from '@auth/infrastructure/persistence/entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '@auth/infrastructure/persistence/entities/email-verification-token.entity';
import { VerificationAttemptEntity } from '@auth/infrastructure/persistence/entities/verification-attempt.entity';
import { TypeOrmSessionRepository } from '@auth/infrastructure/persistence/repositories/typeorm-session.repository';
import { TypeOrmPasswordResetTokenRepository } from '@auth/infrastructure/persistence/repositories/typeorm-password-reset-token.repository';
import { TypeOrmEmailVerificationTokenRepository } from '@auth/infrastructure/persistence/repositories/typeorm-email-verification-token.repository';
import { TypeOrmVerificationAttemptRepository } from '@auth/infrastructure/persistence/repositories/typeorm-verification-attempt.repository';
import { SignUpHandler } from '@auth/application/commands/sign-up/sign-up.handler';
import { SignInHandler } from '@auth/application/commands/sign-in/sign-in.handler';
import { SignOutHandler } from '@auth/application/commands/sign-out/sign-out.handler';
import { RefreshSessionHandler } from '@auth/application/commands/refresh-session/refresh-session.handler';
import { SocialSignInHandler } from '@auth/application/commands/social-sign-in/social-sign-in.handler';
import { ForgotPasswordHandler } from '@auth/application/commands/forgot-password/forgot-password.handler';
import { ResetPasswordHandler } from '@auth/application/commands/reset-password/reset-password.handler';
import { VerifyEmailHandler } from '@auth/application/commands/verify-email/verify-email.handler';
import { ResendVerificationCodeHandler } from '@auth/application/commands/resend-verification-code/resend-verification-code.handler';
import { UserSignedUpEventHandler } from '@auth/application/event-handlers/user-signed-up.event-handler';
import { UserSignedInEventHandler } from '@auth/application/event-handlers/user-signed-in.event-handler';
import { UserSignedOutEventHandler } from '@auth/application/event-handlers/user-signed-out.event-handler';
import { SessionCreatedEventHandler } from '@auth/application/event-handlers/session-created.event-handler';
import { SessionArchivedEventHandler } from '@auth/application/event-handlers/session-archived.event-handler';
import { SessionRefreshedEventHandler } from '@auth/application/event-handlers/session-refreshed.event-handler';
import { PasswordResetRequestedEventHandler } from '@auth/application/event-handlers/password-reset-requested.event-handler';
import { PasswordResetCompletedEventHandler } from '@auth/application/event-handlers/password-reset-completed.event-handler';
import { EmailVerificationRequestedEventHandler } from '@auth/application/event-handlers/email-verification-requested.event-handler';
import { EmailVerificationCompletedEventHandler } from '@auth/application/event-handlers/email-verification-completed.event-handler';
import { EmailVerificationFailedEventHandler } from '@auth/application/event-handlers/email-verification-failed.event-handler';
import { VerificationCodeResentEventHandler } from '@auth/application/event-handlers/verification-code-resent.event-handler';
import { UserVerificationBlockedEventHandler } from '@auth/application/event-handlers/user-verification-blocked.event-handler';
import { CryptoCodeGeneratorService } from '@shared/infrastructure/services/crypto-code-generator.service';
import { JwtStrategy } from '@auth/infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from '@auth/infrastructure/strategies/google.strategy';
import { FacebookStrategy } from '@auth/infrastructure/strategies/facebook.strategy';
import { AppleStrategy } from '@auth/infrastructure/strategies/apple.strategy';
import { MicrosoftStrategy } from '@auth/infrastructure/strategies/microsoft.strategy';
import { JwtAuthGuard } from '@auth/infrastructure/guards/jwt-auth.guard';
import { GoogleAuthGuard } from '@auth/infrastructure/guards/google-auth.guard';
import { FacebookAuthGuard } from '@auth/infrastructure/guards/facebook-auth.guard';
import { AppleAuthGuard } from '@auth/infrastructure/guards/apple-auth.guard';
import { MicrosoftAuthGuard } from '@auth/infrastructure/guards/microsoft-auth.guard';
import { SignUpController } from '@auth/infrastructure/controllers/sign-up/sign-up.controller';
import { SignInController } from '@auth/infrastructure/controllers/sign-in/sign-in.controller';
import { SignOutController } from '@auth/infrastructure/controllers/sign-out/sign-out.controller';
import { RefreshSessionController } from '@auth/infrastructure/controllers/refresh-session/refresh-session.controller';
import { GoogleAuthController } from '@auth/infrastructure/controllers/google-auth/google-auth.controller';
import { GoogleCallbackController } from '@auth/infrastructure/controllers/google-callback/google-callback.controller';
import { FacebookAuthController } from '@auth/infrastructure/controllers/facebook-auth/facebook-auth.controller';
import { FacebookCallbackController } from '@auth/infrastructure/controllers/facebook-callback/facebook-callback.controller';
import { AppleAuthController } from '@auth/infrastructure/controllers/apple-auth/apple-auth.controller';
import { AppleCallbackController } from '@auth/infrastructure/controllers/apple-callback/apple-callback.controller';
import { MicrosoftAuthController } from '@auth/infrastructure/controllers/microsoft-auth/microsoft-auth.controller';
import { MicrosoftCallbackController } from '@auth/infrastructure/controllers/microsoft-callback/microsoft-callback.controller';
import { AuthProvidersController } from '@auth/infrastructure/controllers/auth-providers/auth-providers.controller';
import { ForgotPasswordController } from '@auth/infrastructure/controllers/forgot-password/forgot-password.controller';
import { ResetPasswordController } from '@auth/infrastructure/controllers/reset-password/reset-password.controller';
import { AuthFacade } from '@auth/infrastructure/facade/auth.facade';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { VerifyEmailController } from '@auth/infrastructure/controllers/verify-email/verify-email.controller';
import { ResendVerificationCodeController } from '@auth/infrastructure/controllers/resend-verification-code/resend-verification-code.controller';
import { EmailVerifiedGuard } from '@auth/infrastructure/guards/email-verified.guard';

const CommandHandlers = [
  SignUpHandler,
  SignInHandler,
  SignOutHandler,
  RefreshSessionHandler,
  SocialSignInHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  VerifyEmailHandler,
  ResendVerificationCodeHandler,
];

const EventHandlers = [
  UserSignedUpEventHandler,
  UserSignedInEventHandler,
  UserSignedOutEventHandler,
  SessionCreatedEventHandler,
  SessionArchivedEventHandler,
  SessionRefreshedEventHandler,
  PasswordResetRequestedEventHandler,
  PasswordResetCompletedEventHandler,
  EmailVerificationRequestedEventHandler,
  EmailVerificationCompletedEventHandler,
  EmailVerificationFailedEventHandler,
  VerificationCodeResentEventHandler,
  UserVerificationBlockedEventHandler,
];

const Strategies = [
  JwtStrategy,
  GoogleStrategy,
  FacebookStrategy,
  MicrosoftStrategy,
  AppleStrategy, // DISABLED by default - See ADR-001
];

const Guards = [
  JwtAuthGuard,
  GoogleAuthGuard,
  FacebookAuthGuard,
  MicrosoftAuthGuard,
  AppleAuthGuard, // DISABLED by default - See ADR-001
  EmailVerifiedGuard,
];

const Controllers = [
  SignUpController,
  SignInController,
  SignOutController,
  RefreshSessionController,
  AuthProvidersController,
  GoogleAuthController,
  GoogleCallbackController,
  FacebookAuthController,
  FacebookCallbackController,
  MicrosoftAuthController,
  MicrosoftCallbackController,
  AppleAuthController, // DISABLED by default - returns 501
  AppleCallbackController, // DISABLED by default - returns 501
  ForgotPasswordController,
  ResetPasswordController,
  VerifyEmailController,
  ResendVerificationCodeController,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionEntity,
      PasswordResetTokenEntity,
      EmailVerificationTokenEntity,
      VerificationAttemptEntity,
    ]),
    CqrsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
    MediatorModule,
  ],
  controllers: Controllers,
  providers: [
    {
      provide: INJECTION_TOKENS.SESSION_CONTRACT,
      useClass: TypeOrmSessionRepository,
    },
    {
      provide: INJECTION_TOKENS.PASSWORD_RESET_TOKEN_CONTRACT,
      useClass: TypeOrmPasswordResetTokenRepository,
    },
    {
      provide: INJECTION_TOKENS.EMAIL_VERIFICATION_TOKEN_CONTRACT,
      useClass: TypeOrmEmailVerificationTokenRepository,
    },
    {
      provide: INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
      useClass: TypeOrmVerificationAttemptRepository,
    },
    {
      provide: INJECTION_TOKENS.CODE_GENERATOR_CONTRACT,
      useClass: CryptoCodeGeneratorService,
    },
    ...CommandHandlers,
    ...EventHandlers,
    ...Strategies,
    ...Guards,
    AuthFacade,
  ],
  exports: [
    JwtAuthGuard,
    JwtStrategy,
    AuthFacade,
    EmailVerifiedGuard,
    INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
  ],
})
export class AuthModule {}
