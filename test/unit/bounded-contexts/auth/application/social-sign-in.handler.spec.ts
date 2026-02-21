import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventPublisher, EventBus } from '@nestjs/cqrs';
import { SocialSignInHandler } from '@auth/application/commands/social-sign-in/social-sign-in.handler';
import { SocialSignInCommand } from '@auth/application/commands/social-sign-in/social-sign-in.command';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('Social sign-in — OAuth provider linking (EC-002)', () => {
  let handler: SocialSignInHandler;
  let mediatorService: {
    findUserBySocialProvider: jest.Mock;
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    linkProviderToUser: jest.Mock;
    createUserFromSocial: jest.Mock;
    existsUserByUsername: jest.Mock;
  };
  let sessionContract: jest.Mocked<ISessionContract>;

  const googleCommand = new SocialSignInCommand(
    'ana.torres@gmail.com',
    'Ana Torres',
    'google',
    'google-uid-999',
  );

  beforeEach(async () => {
    mediatorService = {
      findUserBySocialProvider: jest.fn(),
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      linkProviderToUser: jest.fn().mockResolvedValue(undefined),
      createUserFromSocial: jest.fn(),
      existsUserByUsername: jest.fn().mockResolvedValue(false),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return config[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
        const value = config[key];
        if (!value) throw new Error(`Config key "${key}" not found`);
        return value;
      }),
    };

    const mockSessionContract = {
      persist: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialSignInHandler,
        { provide: MediatorService, useValue: mediatorService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: EventBus, useValue: mockEventBus },
        { provide: INJECTION_TOKENS.SESSION_CONTRACT, useValue: mockSessionContract },
      ],
    }).compile();

    handler = module.get<SocialSignInHandler>(SocialSignInHandler);
    sessionContract = module.get(INJECTION_TOKENS.SESSION_CONTRACT);
  });

  describe('Given a customer who has already connected their Google account to Stocka', () => {
    describe('When they sign in with Google again', () => {
      it('Then the system recognises the provider link and signs them in directly', async () => {
        // Given
        const alreadyLinkedUser = UserMother.createSocialOnly({
          id: 5,
          email: 'ana.torres@gmail.com',
          provider: 'google',
        });
        mediatorService.findUserBySocialProvider.mockResolvedValue(alreadyLinkedUser);

        // When
        const result = await handler.execute(googleCommand);

        // Then
        expect(result.accessToken).toBe('mock-token');
        expect(mediatorService.linkProviderToUser).not.toHaveBeenCalled();
        expect(mediatorService.createUserFromSocial).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a customer who registered manually with the same email as their Google account', () => {
    describe('When they sign in with Google for the first time', () => {
      it('Then the system automatically links Google to their existing account', async () => {
        // Given
        const manualUser = UserMother.create({ id: 10, email: 'ana.torres@gmail.com' });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(manualUser);
        mediatorService.findUserById.mockResolvedValue(manualUser);

        // When
        await handler.execute(googleCommand);

        // Then
        expect(mediatorService.linkProviderToUser).toHaveBeenCalledWith(
          10,
          'google',
          'google-uid-999',
        );
      });

      it('Then the customer receives valid tokens to access their account', async () => {
        // Given
        const manualUser = UserMother.create({ id: 10, email: 'ana.torres@gmail.com' });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(manualUser);
        mediatorService.findUserById.mockResolvedValue(manualUser);

        // When
        const result = await handler.execute(googleCommand);

        // Then
        expect(result.accessToken).toBe('mock-token');
        expect(result.refreshToken).toBe('mock-token');
        expect(sessionContract.persist).toHaveBeenCalled();
      });

      it('Then no new account is created — only the existing one is used', async () => {
        // Given
        const manualUser = UserMother.create({ id: 10, email: 'ana.torres@gmail.com' });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(manualUser);
        mediatorService.findUserById.mockResolvedValue(manualUser);

        // When
        await handler.execute(googleCommand);

        // Then
        expect(mediatorService.createUserFromSocial).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a customer who registered but never verified their email, and now signs in with Google', () => {
    describe('When they sign in with Google using the same email as their unverified account', () => {
      it('Then Google is linked to their account, putting it in the "Flexible Pendiente" state', async () => {
        // Given
        const pendingUser = UserMother.createPendingVerification({
          id: 11,
          email: 'ana.torres@gmail.com',
        });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(pendingUser);
        mediatorService.findUserById.mockResolvedValue(pendingUser);

        // When
        await handler.execute(googleCommand);

        // Then
        expect(mediatorService.linkProviderToUser).toHaveBeenCalledWith(
          11,
          'google',
          'google-uid-999',
        );
      });

      it('Then the customer receives tokens so they can access Stocka right away', async () => {
        // Given
        const pendingUser = UserMother.createPendingVerification({
          id: 11,
          email: 'ana.torres@gmail.com',
        });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(pendingUser);
        mediatorService.findUserById.mockResolvedValue(pendingUser);

        // When
        const result = await handler.execute(googleCommand);

        // Then
        expect(result.accessToken).toBe('mock-token');
        expect(sessionContract.persist).toHaveBeenCalled();
      });
    });
  });

  describe('Given a brand-new visitor who has never used Stocka before', () => {
    describe('When they sign in with Google for the first time', () => {
      it('Then the system creates a new Stocka account for them automatically', async () => {
        // Given
        const newUser = UserMother.createSocialOnly({ id: 99, email: 'ana.torres@gmail.com' });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(null);
        mediatorService.createUserFromSocial.mockResolvedValue(newUser);

        // When
        const result = await handler.execute(googleCommand);

        // Then
        expect(mediatorService.createUserFromSocial).toHaveBeenCalledWith(
          'ana.torres@gmail.com',
          expect.any(String),
          'google',
          'google-uid-999',
        );
        expect(result.accessToken).toBe('mock-token');
      });

      it('Then no provider linking happens — the new account is already social', async () => {
        // Given
        const newUser = UserMother.createSocialOnly({ id: 99, email: 'ana.torres@gmail.com' });
        mediatorService.findUserBySocialProvider.mockResolvedValue(null);
        mediatorService.findUserByEmail.mockResolvedValue(null);
        mediatorService.createUserFromSocial.mockResolvedValue(newUser);

        // When
        await handler.execute(googleCommand);

        // Then
        expect(mediatorService.linkProviderToUser).not.toHaveBeenCalled();
      });
    });
  });
});
