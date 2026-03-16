import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';

import { SignInController } from '@authentication/infrastructure/controllers/sign-in/sign-in.controller';
import { SignUpController } from '@authentication/infrastructure/controllers/sign-up/sign-up.controller';
import { SignOutController } from '@authentication/infrastructure/controllers/sign-out/sign-out.controller';
import { RefreshSessionController } from '@authentication/infrastructure/controllers/refresh-session/refresh-session.controller';
import { ForgotPasswordController } from '@authentication/infrastructure/controllers/forgot-password/forgot-password.controller';
import { ResetPasswordController } from '@authentication/infrastructure/controllers/reset-password/reset-password.controller';
import { VerifyEmailController } from '@authentication/infrastructure/controllers/verify-email/verify-email.controller';
import { ResendVerificationCodeController } from '@authentication/infrastructure/controllers/resend-verification-code/resend-verification-code.controller';
import { AuthenticationProvidersController } from '@authentication/infrastructure/controllers/authentication-providers/authentication-providers.controller';
import { GoogleCallbackController } from '@authentication/infrastructure/controllers/google-callback/google-callback.controller';
import { FacebookCallbackController } from '@authentication/infrastructure/controllers/facebook-callback/facebook-callback.controller';
import { MicrosoftCallbackController } from '@authentication/infrastructure/controllers/microsoft-callback/microsoft-callback.controller';
import { AppleCallbackController } from '@authentication/infrastructure/controllers/apple-callback/apple-callback.controller';

import { ok, err } from '@shared/domain/result';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function buildMockCommandBus(): jest.Mocked<CommandBus> {
  return { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
}

function buildMockRes(): jest.Mocked<Response> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as jest.Mocked<Response>;
}

function buildMockReq(overrides?: Partial<Request>): Request {
  return {
    cookies: {},
    headers: { 'accept-language': 'en-US' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SignInController', () => {
  let controller: SignInController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignInController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(SignInController);
  });

  describe('Given valid sign-in credentials', () => {
    describe('When handle is called', () => {
      it('Then it returns the sign-in response and sets the refresh cookie', async () => {
        const mockUser = {
          uuid: 'user-uuid-1',
          createdAt: new Date('2024-01-01'),
        };
        const mockCredential = {
          email: 'user@example.com',
        };
        const mockResult = ok({
          user: mockUser,
          credential: mockCredential,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-abc',
          emailVerificationRequired: false,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();

        const result = await controller.handle(
          { emailOrUsername: 'user@example.com', password: 'Pass@1234' },
          res,
        );

        expect(result.accessToken).toBe('access-token-123');
        expect(result.user.email).toBe('user@example.com');
        expect(result.emailVerificationRequired).toBe(false);
        expect(res.cookie).toHaveBeenCalledWith(
          'refresh_token',
          'refresh-token-abc',
          expect.any(Object),
        );
      });
    });
  });

  describe('Given invalid credentials', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { InvalidCredentialsException } = await import(
          '@authentication/domain/exceptions/invalid-credentials.exception'
        );
        const mockResult = err(new InvalidCredentialsException());
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();

        await expect(
          controller.handle({ emailOrUsername: 'bad@email.com', password: 'wrong' }, res),
        ).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SignUpController', () => {
  let controller: SignUpController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignUpController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(SignUpController);
  });

  describe('Given valid sign-up data', () => {
    describe('When handle is called', () => {
      it('Then it returns the sign-up response with emailSent flag', async () => {
        const mockUser = {
          uuid: 'new-uuid',
          createdAt: new Date('2024-01-01'),
        };
        const mockCredential = {
          email: 'new@example.com',
        };
        const mockResult = ok({
          user: mockUser,
          credential: mockCredential,
          accessToken: 'at-xyz',
          refreshToken: 'rt-xyz',
          emailSent: true,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();
        const req = buildMockReq();

        const result = await controller.handle(
          { email: 'new@example.com', username: 'newuser', password: 'SecureP@ss1' },
          req,
          res,
        );

        expect(result.accessToken).toBe('at-xyz');
        expect(result.emailSent).toBe(true);
      });
    });
  });

  describe('Given a domain error during sign-up', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { EmailAlreadyExistsException } = await import(
          '@authentication/domain/exceptions/email-already-exists.exception'
        );
        const mockResult = err(new EmailAlreadyExistsException());
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();
        const req = buildMockReq();

        await expect(
          controller.handle({ email: 'dup@example.com', username: 'u', password: 'p' }, req, res),
        ).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SignOutController', () => {
  let controller: SignOutController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignOutController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(SignOutController);
  });

  describe('Given a request with a refresh_token cookie', () => {
    describe('When handle is called', () => {
      it('Then it executes SignOutCommand and clears the cookie', async () => {
        commandBus.execute.mockResolvedValue(undefined);
        const res = buildMockRes();
        const req = buildMockReq({ cookies: { refresh_token: 'some-token' } });

        const result = await controller.handle(req, res);

        expect(commandBus.execute).toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalled();
        expect(result.message).toBe('Successfully signed out');
      });
    });
  });

  describe('Given a request without a refresh_token cookie', () => {
    describe('When handle is called', () => {
      it('Then it does not execute SignOutCommand but still clears the cookie', async () => {
        const res = buildMockRes();
        const req = buildMockReq({ cookies: {} });

        const result = await controller.handle(req, res);

        expect(commandBus.execute).not.toHaveBeenCalled();
        expect(res.clearCookie).toHaveBeenCalled();
        expect(result.message).toBe('Successfully signed out');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('RefreshSessionController', () => {
  let controller: RefreshSessionController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefreshSessionController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(RefreshSessionController);
  });

  describe('Given a request with a valid refresh token cookie', () => {
    describe('When handle is called', () => {
      it('Then it returns a new accessToken', async () => {
        const mockResult = ok({ accessToken: 'new-at', refreshToken: 'new-rt' });
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();
        const req = buildMockReq({ cookies: { refresh_token: 'valid-rt' } });

        const result = await controller.handle(req, res);

        expect(result.accessToken).toBe('new-at');
        expect(res.cookie).toHaveBeenCalled();
      });
    });
  });

  describe('Given a request with no refresh token cookie', () => {
    describe('When handle is called', () => {
      it('Then it throws UnauthorizedException', async () => {
        const res = buildMockRes();
        const req = buildMockReq({ cookies: {} });

        await expect(controller.handle(req, res)).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('Given a request with undefined cookies', () => {
    describe('When handle is called', () => {
      it('Then it throws UnauthorizedException', async () => {
        const res = buildMockRes();
        const req = buildMockReq({ cookies: undefined as unknown as Record<string, string> });

        await expect(controller.handle(req, res)).rejects.toThrow(UnauthorizedException);
      });
    });
  });

  describe('Given a domain error during refresh', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { TokenExpiredException } = await import(
          '@authentication/domain/exceptions/token-expired.exception'
        );
        const mockResult = err(new TokenExpiredException());
        commandBus.execute.mockResolvedValue(mockResult);
        const res = buildMockRes();
        const req = buildMockReq({ cookies: { refresh_token: 'expired-rt' } });

        await expect(controller.handle(req, res)).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ForgotPasswordController', () => {
  let controller: ForgotPasswordController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ForgotPasswordController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(ForgotPasswordController);
  });

  describe('Given a valid email', () => {
    describe('When handle is called', () => {
      it('Then it returns a message from the command result', async () => {
        commandBus.execute.mockResolvedValue({ message: 'If account exists, email was sent' });
        const req = buildMockReq();

        const result = await controller.handle({ email: 'user@example.com' }, req);

        expect(result.message).toBe('If account exists, email was sent');
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ResetPasswordController', () => {
  let controller: ResetPasswordController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResetPasswordController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(ResetPasswordController);
  });

  describe('Given a valid reset token and new password', () => {
    describe('When handle is called', () => {
      it('Then it returns a success message', async () => {
        const mockResult = ok({ message: 'Password reset successfully' });
        commandBus.execute.mockResolvedValue(mockResult);

        const result = await controller.handle({
          token: 'valid-token',
          newPassword: 'NewSecure@1234',
        });

        expect(result.message).toBe('Password reset successfully');
      });
    });
  });

  describe('Given an expired or invalid token', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { TokenExpiredException } = await import(
          '@authentication/domain/exceptions/token-expired.exception'
        );
        const mockResult = err(new TokenExpiredException());
        commandBus.execute.mockResolvedValue(mockResult);

        await expect(
          controller.handle({ token: 'expired', newPassword: 'P@ss123' }),
        ).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VerifyEmailController', () => {
  let controller: VerifyEmailController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerifyEmailController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(VerifyEmailController);
  });

  describe('Given a valid email and verification code', () => {
    describe('When handle is called', () => {
      it('Then it returns success: true with a message', async () => {
        const mockResult = ok({ success: true, message: 'Email verified successfully' });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq();

        const result = await controller.handle({ email: 'user@example.com', code: 'ABC123' }, req);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Email verified successfully');
      });
    });
  });

  describe('Given an invalid verification code', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { InvalidVerificationCodeException } = await import(
          '@authentication/domain/exceptions/invalid-verification-code.exception'
        );
        const mockResult = err(new InvalidVerificationCodeException());
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq();

        await expect(
          controller.handle({ email: 'user@example.com', code: 'WRONG1' }, req),
        ).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ResendVerificationCodeController', () => {
  let controller: ResendVerificationCodeController;
  let commandBus: jest.Mocked<CommandBus>;

  beforeEach(async () => {
    commandBus = buildMockCommandBus();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResendVerificationCodeController],
      providers: [{ provide: CommandBus, useValue: commandBus }],
    }).compile();
    controller = module.get(ResendVerificationCodeController);
  });

  describe('Given a valid email for resend', () => {
    describe('When handle is called', () => {
      it('Then it returns success with cooldown info', async () => {
        const mockResult = ok({
          success: true,
          message: 'Code resent',
          cooldownSeconds: 60,
          remainingResends: 4,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq({ headers: { 'x-forwarded-for': '10.0.0.1', 'accept-language': 'en' } });

        const result = await controller.handle({ email: 'user@example.com' }, req, 'Mozilla/5.0');

        expect(result.success).toBe(true);
        expect(result.cooldownSeconds).toBe(60);
        expect(result.remainingResends).toBe(4);
      });
    });

    describe('When the x-forwarded-for header is an array', () => {
      it('Then it uses the first IP from the array', async () => {
        const mockResult = ok({
          success: true,
          message: 'Code resent',
          cooldownSeconds: 0,
          remainingResends: 5,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq({
          headers: { 'x-forwarded-for': ['203.0.113.1', '10.0.0.1'] },
        });

        const result = await controller.handle({ email: 'user@example.com' }, req);

        expect(result.success).toBe(true);
        expect(commandBus.execute).toHaveBeenCalled();
      });
    });

    describe('When the request has no x-forwarded-for header and no req.ip', () => {
      it('Then it falls back to socket.remoteAddress', async () => {
        const mockResult = ok({
          success: true,
          message: 'Code resent',
          cooldownSeconds: 0,
          remainingResends: 5,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq({
          headers: {},
          ip: undefined as unknown as string,
          socket: { remoteAddress: '10.10.10.10' } as unknown as import('net').Socket,
        });

        const result = await controller.handle({ email: 'user@example.com' }, req);

        expect(result.success).toBe(true);
        expect(commandBus.execute).toHaveBeenCalled();
      });
    });

    describe('When the request has no x-forwarded-for, no req.ip, and no socket.remoteAddress', () => {
      it('Then it defaults to 0.0.0.0 as the IP address', async () => {
        const mockResult = ok({
          success: true,
          message: 'Code resent',
          cooldownSeconds: 0,
          remainingResends: 5,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq({
          headers: {},
          ip: undefined as unknown as string,
          socket: { remoteAddress: undefined } as unknown as import('net').Socket,
        });

        const result = await controller.handle({ email: 'user@example.com' }, req);

        expect(result.success).toBe(true);
        expect(commandBus.execute).toHaveBeenCalled();
      });
    });

    describe('When the request has no x-forwarded-for header', () => {
      it('Then it falls back to req.ip', async () => {
        const mockResult = ok({
          success: true,
          message: 'Code resent',
          cooldownSeconds: 0,
          remainingResends: 5,
        });
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq({ headers: {}, ip: '192.168.1.1' });

        const result = await controller.handle({ email: 'user@example.com' }, req);

        expect(result.success).toBe(true);
        expect(commandBus.execute).toHaveBeenCalled();
      });
    });
  });

  describe('Given a domain error (e.g. max resends exceeded)', () => {
    describe('When handle is called', () => {
      it('Then it throws an HttpException', async () => {
        const { MaxResendsExceededException } = await import(
          '@authentication/domain/exceptions/max-resends-exceeded.exception'
        );
        const mockResult = err(new MaxResendsExceededException());
        commandBus.execute.mockResolvedValue(mockResult);
        const req = buildMockReq();

        await expect(
          controller.handle({ email: 'user@example.com' }, req),
        ).rejects.toThrow();
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AuthenticationProvidersController', () => {
  let controller: AuthenticationProvidersController;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationProvidersController],
      providers: [{ provide: ConfigService, useValue: configService }],
    }).compile();
    controller = module.get(AuthenticationProvidersController);
  });

  describe('Given all social providers are enabled', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultVal?: unknown) => {
        if (key === 'API_PREFIX') return 'api';
        if (key === 'PORT') return 3001;
        if (key === 'GOOGLE_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'FACEBOOK_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'MICROSOFT_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'APPLE_AUTHENTICATION_ENABLED') return 'true';
        return defaultVal;
      });
    });

    it('Then getProviders returns all 4 enabled providers', () => {
      const response = controller.getProviders();
      expect(response.providers).toHaveLength(4);
      expect(response.emailPasswordEnabled).toBe(true);
    });
  });

  describe('Given Apple authentication is disabled', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultVal?: unknown) => {
        if (key === 'API_PREFIX') return 'api';
        if (key === 'PORT') return 3001;
        if (key === 'GOOGLE_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'FACEBOOK_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'MICROSOFT_AUTHENTICATION_ENABLED') return 'true';
        if (key === 'APPLE_AUTHENTICATION_ENABLED') return 'false';
        return defaultVal;
      });
    });

    it('Then getProviders returns only 3 providers', () => {
      const response = controller.getProviders();
      expect(response.providers).toHaveLength(3);
      const providerIds = response.providers.map((p) => p.id);
      expect(providerIds).not.toContain('apple');
    });
  });

  describe('Given all social providers are disabled', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultVal?: unknown) => {
        if (key === 'API_PREFIX') return 'api';
        if (key === 'PORT') return 3001;
        return 'false';
      });
    });

    it('Then getProviders returns an empty providers list', () => {
      const response = controller.getProviders();
      expect(response.providers).toHaveLength(0);
      expect(response.emailPasswordEnabled).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Callback Controllers — shared pattern: CommandBus + ConfigService + redirect
// ─────────────────────────────────────────────────────────────────────────────

function buildOAuthCallbackTests(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ControllerClass: new (...args: any[]) => any,
  displayName: string,
  provider: string,
): void {
  describe(`${displayName}CallbackController`, () => {
    let controller: { handle: (req: Request, res: Response) => Promise<void> };
    let commandBus: jest.Mocked<CommandBus>;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
      commandBus = buildMockCommandBus();
      configService = { get: jest.fn().mockReturnValue('http://localhost:5173') } as unknown as jest.Mocked<ConfigService>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module: TestingModule = await Test.createTestingModule({
        controllers: [ControllerClass],
        providers: [
          { provide: CommandBus, useValue: commandBus },
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      controller = module.get(ControllerClass);
    });

    describe(`Given a ${provider} OAuth callback with a valid profile`, () => {
      describe('When handle is called', () => {
        it('Then it executes SocialSignInCommand and redirects to the frontend', async () => {
          commandBus.execute.mockResolvedValue({
            accessToken: 'at-social',
            refreshToken: 'rt-social',
          });
          const res = buildMockRes();
          const req = buildMockReq({
            user: {
              email: 'social@example.com',
              displayName: 'Social User',
              provider,
              providerId: 'provider-id-123',
            } as unknown as Request['user'],
          });

          await controller.handle(req, res);

          expect(commandBus.execute).toHaveBeenCalled();
          expect(res.redirect).toHaveBeenCalled();
          const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][0] as string;
          expect(redirectUrl).toContain('accessToken=at-social');
        });
      });
    });
  });
}

buildOAuthCallbackTests(GoogleCallbackController, 'Google', 'google');
buildOAuthCallbackTests(FacebookCallbackController, 'Facebook', 'facebook');
buildOAuthCallbackTests(MicrosoftCallbackController, 'Microsoft', 'microsoft');
buildOAuthCallbackTests(AppleCallbackController, 'Apple', 'apple');
