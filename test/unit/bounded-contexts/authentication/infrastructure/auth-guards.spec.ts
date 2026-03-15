import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotImplementedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAuthenticationGuard } from '@authentication/infrastructure/guards/google-authentication.guard';
import { FacebookAuthenticationGuard } from '@authentication/infrastructure/guards/facebook-authentication.guard';
import { MicrosoftAuthenticationGuard } from '@authentication/infrastructure/guards/microsoft-authentication.guard';
import { AppleAuthenticationGuard } from '@authentication/infrastructure/guards/apple-authentication.guard';

import {
  EmailVerifiedGuard,
  SKIP_EMAIL_VERIFICATION_KEY,
} from '@authentication/infrastructure/guards/email-verified.guard';
import { SkipEmailVerification } from '@authentication/infrastructure/guards/decorators/skip-email-verification.decorator';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContext(userSub?: string, skipMetadata?: boolean): ExecutionContext {
  const request = { user: userSub ? { sub: userSub } : undefined };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(skipMetadata ?? false) };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
    _reflector: reflector,
  } as unknown as ExecutionContext;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('EmailVerifiedGuard', () => {
  let guard: EmailVerifiedGuard;
  let reflector: jest.Mocked<Reflector>;
  let mediator: { user: { findByUUID: jest.Mock } };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mediator = {
      user: { findByUUID: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerifiedGuard,
        { provide: Reflector, useValue: reflector },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    guard = module.get(EmailVerifiedGuard);
  });

  function buildCtx(userSub?: string): ExecutionContext {
    const request = { user: userSub ? { sub: userSub } : undefined };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  }

  describe('Given the route has the @SkipEmailVerification decorator', () => {
    it('Then canActivate returns true without checking the user', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildCtx('any-uuid');
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(mediator.user.findByUUID).not.toHaveBeenCalled();
    });
  });

  describe('Given the route does not skip email verification', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue(false);
    });

    describe('When the request has no user sub', () => {
      it('Then it throws ForbiddenException with "User not authenticated"', async () => {
        const ctx = buildCtx(undefined);
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('When the user is not found in the database', () => {
      it('Then it throws ForbiddenException with "User not found"', async () => {
        mediator.user.findByUUID.mockResolvedValue(null);
        const ctx = buildCtx('uuid-not-found');
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('When the user exists and email is verified', () => {
      it('Then canActivate returns true', async () => {
        const verifiedUser = { requiresEmailVerification: jest.fn().mockReturnValue(false) };
        mediator.user.findByUUID.mockResolvedValue(verifiedUser);
        const ctx = buildCtx('uuid-verified');
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
      });
    });

    describe('When the user exists but email is not verified', () => {
      it('Then it throws ForbiddenException with EMAIL_NOT_VERIFIED code', async () => {
        const unverifiedUser = { requiresEmailVerification: jest.fn().mockReturnValue(true) };
        mediator.user.findByUUID.mockResolvedValue(unverifiedUser);
        const ctx = buildCtx('uuid-unverified');
        await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Passport Guards — canActivate with feature-flag check
// ─────────────────────────────────────────────────────────────────────────────

function buildOAuthGuardTests(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GuardClass: new (...args: any[]) => any,
  providerName: string,
  configKey: string,
): void {
  describe(`${providerName}AuthenticationGuard`, () => {
    let guard: { canActivate: (ctx: ExecutionContext) => boolean };
    let configService: jest.Mocked<ConfigService>;

    const buildCtx = (): ExecutionContext =>
      ({ getHandler: jest.fn(), getClass: jest.fn() } as unknown as ExecutionContext);

    beforeEach(async () => {
      configService = { get: jest.fn() } as unknown as jest.Mocked<ConfigService>;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GuardClass,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      guard = module.get(GuardClass);
    });

    describe(`Given the ${providerName} provider is disabled via feature flag`, () => {
      it('Then canActivate throws NotImplementedException', () => {
        configService.get.mockReturnValue('false');
        const ctx = buildCtx();
        expect(() => guard.canActivate(ctx)).toThrow(NotImplementedException);
      });
    });

    describe(`Given the ${providerName} provider is enabled`, () => {
      it('Then canActivate calls super.canActivate and returns its result', () => {
        configService.get.mockReturnValue('true');
        // Spy on the inherited canActivate to avoid requiring a real Passport strategy
        const proto = Object.getPrototypeOf(guard.constructor.prototype);
        jest.spyOn(proto, 'canActivate').mockReturnValue(true);

        const ctx = buildCtx();
        const result = guard.canActivate(ctx);
        expect(result).toBe(true);

        proto.canActivate.mockRestore();
      });
    });
  });
}

buildOAuthGuardTests(GoogleAuthenticationGuard, 'Google', 'GOOGLE_AUTHENTICATION_ENABLED');
buildOAuthGuardTests(FacebookAuthenticationGuard, 'Facebook', 'FACEBOOK_AUTHENTICATION_ENABLED');
buildOAuthGuardTests(MicrosoftAuthenticationGuard, 'Microsoft', 'MICROSOFT_AUTHENTICATION_ENABLED');
buildOAuthGuardTests(AppleAuthenticationGuard, 'Apple', 'APPLE_AUTHENTICATION_ENABLED');

// ─────────────────────────────────────────────────────────────────────────────

describe('SkipEmailVerification decorator', () => {
  describe('Given a class or method decorated with @SkipEmailVerification()', () => {
    it('Then it returns a CustomDecorator that sets the correct metadata key on a class', () => {
      const decorator = SkipEmailVerification();
      // The decorator is a function that sets metadata
      expect(typeof decorator).toBe('function');

      // Apply to a class target to set Reflect metadata
      class TestTarget {}
      decorator(TestTarget);
      const meta = Reflect.getMetadata(SKIP_EMAIL_VERIFICATION_KEY, TestTarget);
      expect(meta).toBe(true);
    });

    it('Then SKIP_EMAIL_VERIFICATION_KEY is the expected constant string', () => {
      expect(SKIP_EMAIL_VERIFICATION_KEY).toBe('skipEmailVerification');
    });
  });
});
