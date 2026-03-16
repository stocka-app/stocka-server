import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { SessionEntity } from '@user/account/session/infrastructure/entities/session.entity';
import { PasswordResetTokenEntity } from '@authentication/infrastructure/persistence/entities/password-reset-token.entity';
import { EmailVerificationTokenEntity } from '@authentication/infrastructure/persistence/entities/email-verification-token.entity';
import { VerificationAttemptEntity } from '@authentication/infrastructure/persistence/entities/verification-attempt.entity';
import { TypeOrmSessionRepository } from '@authentication/infrastructure/persistence/repositories/typeorm-session.repository';
import { TypeOrmPasswordResetTokenRepository } from '@authentication/infrastructure/persistence/repositories/typeorm-password-reset-token.repository';
import { TypeOrmEmailVerificationTokenRepository } from '@authentication/infrastructure/persistence/repositories/typeorm-email-verification-token.repository';
import { TypeOrmVerificationAttemptRepository } from '@authentication/infrastructure/persistence/repositories/typeorm-verification-attempt.repository';
import { SignUpHandler } from '@authentication/application/commands/sign-up/sign-up.handler';
import { SignInHandler } from '@authentication/application/commands/sign-in/sign-in.handler';
import { SignOutHandler } from '@authentication/application/commands/sign-out/sign-out.handler';
import { RefreshSessionHandler } from '@authentication/application/commands/refresh-session/refresh-session.handler';
import { SocialSignInHandler } from '@authentication/application/commands/social-sign-in/social-sign-in.handler';
import { ForgotPasswordHandler } from '@authentication/application/commands/forgot-password/forgot-password.handler';
import { ResetPasswordHandler } from '@authentication/application/commands/reset-password/reset-password.handler';
import { VerifyEmailHandler } from '@authentication/application/commands/verify-email/verify-email.handler';
import { ResendVerificationCodeHandler } from '@authentication/application/commands/resend-verification-code/resend-verification-code.handler';
import { UserSignedUpEventHandler } from '@authentication/application/event-handlers/user-signed-up.event-handler';
import { UserSignedInEventHandler } from '@authentication/application/event-handlers/user-signed-in.event-handler';
import { UserSignedOutEventHandler } from '@authentication/application/event-handlers/user-signed-out.event-handler';
import { SessionCreatedEventHandler } from '@authentication/application/event-handlers/session-created.event-handler';
import { SessionArchivedEventHandler } from '@authentication/application/event-handlers/session-archived.event-handler';
import { SessionRefreshedEventHandler } from '@authentication/application/event-handlers/session-refreshed.event-handler';
import { PasswordResetRequestedEventHandler } from '@authentication/application/event-handlers/password-reset-requested.event-handler';
import { PasswordResetCompletedEventHandler } from '@authentication/application/event-handlers/password-reset-completed.event-handler';
import { EmailVerificationRequestedEventHandler } from '@authentication/application/event-handlers/email-verification-requested.event-handler';
import { EmailVerificationCompletedEventHandler } from '@authentication/application/event-handlers/email-verification-completed.event-handler';
import { EmailVerificationFailedEventHandler } from '@authentication/application/event-handlers/email-verification-failed.event-handler';
import { VerificationCodeResentEventHandler } from '@authentication/application/event-handlers/verification-code-resent.event-handler';
import { UserVerificationBlockedEventHandler } from '@authentication/application/event-handlers/user-verification-blocked.event-handler';
import { CryptoCodeGeneratorService } from '@shared/infrastructure/services/crypto-code-generator.service';
import { JwtStrategy } from '@authentication/infrastructure/strategies/jwt.strategy';
import { GoogleStrategy } from '@authentication/infrastructure/strategies/google.strategy';
import { FacebookStrategy } from '@authentication/infrastructure/strategies/facebook.strategy';
import { AppleStrategy } from '@authentication/infrastructure/strategies/apple.strategy';
import { MicrosoftStrategy } from '@authentication/infrastructure/strategies/microsoft.strategy';
import { JwtAuthenticationGuard } from '@authentication/infrastructure/guards/jwt-authentication.guard';
import { GoogleAuthenticationGuard } from '@authentication/infrastructure/guards/google-authentication.guard';
import { FacebookAuthenticationGuard } from '@authentication/infrastructure/guards/facebook-authentication.guard';
import { AppleAuthenticationGuard } from '@authentication/infrastructure/guards/apple-authentication.guard';
import { MicrosoftAuthenticationGuard } from '@authentication/infrastructure/guards/microsoft-authentication.guard';
import { SignUpController } from '@authentication/infrastructure/controllers/sign-up/sign-up.controller';
import { SignInController } from '@authentication/infrastructure/controllers/sign-in/sign-in.controller';
import { SignOutController } from '@authentication/infrastructure/controllers/sign-out/sign-out.controller';
import { RefreshSessionController } from '@authentication/infrastructure/controllers/refresh-session/refresh-session.controller';
import { GoogleAuthenticationController } from '@authentication/infrastructure/controllers/google-authentication/google-authentication.controller';
import { GoogleCallbackController } from '@authentication/infrastructure/controllers/google-callback/google-callback.controller';
import { FacebookAuthenticationController } from '@authentication/infrastructure/controllers/facebook-authentication/facebook-authentication.controller';
import { FacebookCallbackController } from '@authentication/infrastructure/controllers/facebook-callback/facebook-callback.controller';
import { AppleAuthenticationController } from '@authentication/infrastructure/controllers/apple-authentication/apple-authentication.controller';
import { AppleCallbackController } from '@authentication/infrastructure/controllers/apple-callback/apple-callback.controller';
import { MicrosoftAuthenticationController } from '@authentication/infrastructure/controllers/microsoft-authentication/microsoft-authentication.controller';
import { MicrosoftCallbackController } from '@authentication/infrastructure/controllers/microsoft-callback/microsoft-callback.controller';
import { AuthenticationProvidersController } from '@authentication/infrastructure/controllers/authentication-providers/authentication-providers.controller';
import { ForgotPasswordController } from '@authentication/infrastructure/controllers/forgot-password/forgot-password.controller';
import { ResetPasswordController } from '@authentication/infrastructure/controllers/reset-password/reset-password.controller';
import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';
import { SignUpSaga } from '@authentication/application/sagas/sign-up/sign-up.saga';
import {
  ValidateSignUpStep,
  PrepareCredentialsStep,
  RegisterUserStep,
  GenerateTokensStep,
  CreateSessionStep,
  CreateVerificationTokenStep,
  PublishSignUpEventsStep,
  SendVerificationEmailStep,
} from '@authentication/application/sagas/sign-up/steps';
import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';
import {
  ResolveSocialUserStep,
  GenerateSocialTokensStep,
  CreateSocialSessionStep,
  PublishSocialSignInEventsStep,
} from '@authentication/application/sagas/social-sign-in/steps';
import { RefreshSessionSaga } from '@authentication/application/sagas/refresh-session/refresh-session.saga';
import {
  ValidateRefreshTokenStep,
  ArchiveOldSessionStep,
  GenerateRefreshTokensStep,
  CreateNewSessionStep,
  PublishRefreshEventsStep,
} from '@authentication/application/sagas/refresh-session/steps';
import { ResetPasswordSaga } from '@authentication/application/sagas/reset-password/reset-password.saga';
import {
  ValidateResetTokenStep,
  HashNewPasswordStep,
  MarkTokenUsedStep,
  ArchiveUserSessionsStep,
  PublishResetPasswordEventsStep,
} from '@authentication/application/sagas/reset-password/steps';
import { SignInSaga } from '@authentication/application/sagas/sign-in/sign-in.saga';
import {
  ValidateCredentialsStep,
  GenerateSignInTokensStep,
  CreateSignInSessionStep,
  PublishSignInEventsStep,
} from '@authentication/application/sagas/sign-in/steps';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

import { VerifyEmailController } from '@authentication/infrastructure/controllers/verify-email/verify-email.controller';
import { ResendVerificationCodeController } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code.controller';
import { EmailVerifiedGuard } from '@authentication/infrastructure/guards/email-verified.guard';

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
  JwtAuthenticationGuard,
  GoogleAuthenticationGuard,
  FacebookAuthenticationGuard,
  MicrosoftAuthenticationGuard,
  AppleAuthenticationGuard, // DISABLED by default - See ADR-001
  EmailVerifiedGuard,
];

const Controllers = [
  SignUpController,
  SignInController,
  SignOutController,
  RefreshSessionController,
  AuthenticationProvidersController,
  GoogleAuthenticationController,
  GoogleCallbackController,
  FacebookAuthenticationController,
  FacebookCallbackController,
  MicrosoftAuthenticationController,
  MicrosoftCallbackController,
  AppleAuthenticationController, // DISABLED by default - returns 501
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
    SignUpSaga,
    ValidateSignUpStep,
    PrepareCredentialsStep,
    RegisterUserStep,
    GenerateTokensStep,
    CreateSessionStep,
    CreateVerificationTokenStep,
    PublishSignUpEventsStep,
    SendVerificationEmailStep,
    SocialSignInSaga,
    ResolveSocialUserStep,
    GenerateSocialTokensStep,
    CreateSocialSessionStep,
    PublishSocialSignInEventsStep,
    RefreshSessionSaga,
    ValidateRefreshTokenStep,
    ArchiveOldSessionStep,
    GenerateRefreshTokensStep,
    CreateNewSessionStep,
    PublishRefreshEventsStep,
    ResetPasswordSaga,
    ValidateResetTokenStep,
    HashNewPasswordStep,
    MarkTokenUsedStep,
    ArchiveUserSessionsStep,
    PublishResetPasswordEventsStep,
    SignInSaga,
    ValidateCredentialsStep,
    GenerateSignInTokensStep,
    CreateSignInSessionStep,
    PublishSignInEventsStep,
  ],
  exports: [
    JwtAuthenticationGuard,
    JwtStrategy,
    EmailVerifiedGuard,
    INJECTION_TOKENS.VERIFICATION_ATTEMPT_CONTRACT,
  ],
})
export class AuthenticationModule {}
