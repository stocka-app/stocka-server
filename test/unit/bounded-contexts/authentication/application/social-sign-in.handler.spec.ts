import { Test, TestingModule } from '@nestjs/testing';
import { SocialSignInHandler } from '@authentication/application/commands/social-sign-in/social-sign-in.handler';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';
import { ok, err } from '@shared/domain/result';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';

describe('Social sign-in handler — OAuth provider sign-in (EC-002)', () => {
  let handler: SocialSignInHandler;
  let saga: { execute: jest.Mock };

  const mockUser = UserMother.create({ id: 42 });
  const mockCredential = CredentialAccountMother.createWithEmail('ana.torres@gmail.com');

  const googleCommand = new SocialSignInCommand(
    'ana.torres@gmail.com',
    'Ana Torres',
    'google',
    'google-uid-999',
  );

  const sagaOutput = {
    user: mockUser,
    credential: mockCredential,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockSaga = {
      execute: jest.fn().mockResolvedValue(ok(sagaOutput)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialSignInHandler,
        { provide: SocialSignInSaga, useValue: mockSaga },
      ],
    }).compile();

    handler = module.get<SocialSignInHandler>(SocialSignInHandler);
    saga = module.get(SocialSignInSaga);
  });

  describe('Given a customer who authenticates via an OAuth provider', () => {
    describe('When the saga completes successfully', () => {
      it('Then the handler delegates the command to the saga with correct context', async () => {
        await handler.execute(googleCommand);

        expect(saga.execute).toHaveBeenCalledWith({
          email: 'ana.torres@gmail.com',
          displayName: 'Ana Torres',
          provider: 'google',
          providerId: 'google-uid-999',
        });
      });

      it('Then the handler returns the tokens and credential from the saga output', async () => {
        const result = await handler.execute(googleCommand);

        expect(result.accessToken).toBe('mock-access-token');
        expect(result.refreshToken).toBe('mock-refresh-token');
        expect(result.credential.email).toBe('ana.torres@gmail.com');
      });
    });
  });

  describe('Given the saga returns a domain exception', () => {
    describe('When the saga fails with a known business rule violation', () => {
      it('Then the handler re-throws the domain exception', async () => {
        const domainError = new InvalidPasswordException();
        saga.execute.mockResolvedValue(err(domainError));

        await expect(handler.execute(googleCommand)).rejects.toBeInstanceOf(InvalidPasswordException);
      });
    });
  });

  describe('Given the saga throws an infrastructure error', () => {
    describe('When the database or external service is unavailable', () => {
      it('Then the handler propagates the error to the caller', async () => {
        saga.execute.mockRejectedValue(new Error('DB down'));

        await expect(handler.execute(googleCommand)).rejects.toThrow('DB down');
      });
    });
  });
});
