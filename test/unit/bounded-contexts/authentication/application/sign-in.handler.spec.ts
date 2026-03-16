import { Test, TestingModule } from '@nestjs/testing';
import { SignInHandler } from '@authentication/application/commands/sign-in/sign-in.handler';
import { SignInCommand } from '@authentication/application/commands/sign-in/sign-in.command';
import { SignInSaga } from '@authentication/application/sagas/sign-in/sign-in.saga';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';
import { ok, err } from '@shared/domain/result';
import { InvalidCredentialsException } from '@authentication/domain/exceptions/invalid-credentials.exception';

describe('SignInHandler — credentials-based sign-in (EC-001)', () => {
  let handler: SignInHandler;
  let saga: { execute: jest.Mock };

  const mockUser = UserMother.create({ id: 1 });
  const mockCredential = CredentialAccountMother.create({ accountId: 1, email: 'ana@example.com' });

  const command = new SignInCommand('ana@example.com', 'SecurePass1');

  const sagaOutput = {
    user: mockUser,
    credential: mockCredential,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    emailVerificationRequired: false as const,
  };

  beforeEach(async () => {
    const mockSaga = {
      execute: jest.fn().mockResolvedValue(ok(sagaOutput)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SignInHandler, { provide: SignInSaga, useValue: mockSaga }],
    }).compile();

    handler = module.get<SignInHandler>(SignInHandler);
    saga = module.get(SignInSaga);
  });

  describe('Given a customer who submits valid credentials', () => {
    describe('When the saga completes successfully', () => {
      it('Then the handler delegates the command to the saga with the correct context', async () => {
        await handler.execute(command);

        expect(saga.execute).toHaveBeenCalledWith({
          emailOrUsername: 'ana@example.com',
          password: 'SecurePass1',
        });
      });

      it('Then the handler returns the tokens and user from the saga output', async () => {
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.accessToken).toBe('mock-access-token');
        expect(data.refreshToken).toBe('mock-refresh-token');
        expect(data.credential.email).toBe('ana@example.com');
        expect(data.emailVerificationRequired).toBe(false);
      });
    });
  });

  describe('Given the credentials are invalid', () => {
    describe('When the saga returns an InvalidCredentialsException', () => {
      it('Then the handler propagates the err Result to the caller', async () => {
        saga.execute.mockResolvedValue(err(new InvalidCredentialsException()));

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidCredentialsException);
      });
    });
  });

  describe('Given an infrastructure failure inside the saga', () => {
    describe('When the database or service is unavailable', () => {
      it('Then the handler propagates the thrown error to the caller', async () => {
        saga.execute.mockRejectedValue(new Error('DB down'));

        await expect(handler.execute(command)).rejects.toThrow('DB down');
      });
    });
  });
});
