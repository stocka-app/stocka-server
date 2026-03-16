import { Test, TestingModule } from '@nestjs/testing';
import { SignUpHandler } from '@authentication/application/commands/sign-up/sign-up.handler';
import { SignUpCommand } from '@authentication/application/commands/sign-up/sign-up.command';
import { SignUpSaga } from '@authentication/application/sagas/sign-up/sign-up.saga';
import { SignUpSagaOutput } from '@authentication/application/sagas/sign-up/sign-up.saga-context';
import { EmailAlreadyExistsException } from '@authentication/domain/exceptions/email-already-exists.exception';
import { InvalidPasswordException } from '@authentication/domain/exceptions/invalid-password.exception';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err, Result } from '@shared/domain/result';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

describe('SignUpHandler', () => {
  let handler: SignUpHandler;
  let signUpSaga: { execute: jest.Mock };

  const mockUser = UserMother.create({ id: 1 });
  const mockCredential = CredentialAccountMother.create({
    accountId: 1,
    email: 'test@example.com',
  });

  const successOutput: SignUpSagaOutput = {
    user: mockUser,
    credential: mockCredential,
    username: 'testuser',
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    emailSent: true,
  };

  beforeEach(async () => {
    const mockSignUpSaga = {
      execute: jest.fn().mockResolvedValue(ok(successOutput)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SignUpHandler, { provide: SignUpSaga, useValue: mockSignUpSaga }],
    }).compile();

    handler = module.get<SignUpHandler>(SignUpHandler);
    signUpSaga = module.get(SignUpSaga);
  });

  describe('Given the saga completes successfully', () => {
    describe('When the handler executes', () => {
      it('Then it returns the mapped result with emailVerificationRequired', async () => {
        const command = new SignUpCommand('test@example.com', 'testuser', 'Password1');

        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.user).toBeDefined();
        expect(data.credential.email).toBe('test@example.com');
        expect(data.accessToken).toBe('mock-access-token');
        expect(data.refreshToken).toBe('mock-refresh-token');
        expect(data.emailVerificationRequired).toBe(true);
      });

      it('Then it passes the correct input to the saga', async () => {
        const command = new SignUpCommand('test@example.com', 'testuser', 'Password1', 'en');

        await handler.execute(command);

        expect(signUpSaga.execute).toHaveBeenCalledWith({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password1',
          lang: 'en',
        });
      });
    });
  });

  describe('Given the saga returns a domain error', () => {
    describe('When the email already exists', () => {
      it('Then it returns the error as a Result.err', async () => {
        signUpSaga.execute.mockResolvedValue(err(new EmailAlreadyExistsException()));

        const command = new SignUpCommand('existing@example.com', 'testuser', 'Password1');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(EmailAlreadyExistsException);
      });
    });

    describe('When the password is invalid', () => {
      it('Then it returns the error as a Result.err', async () => {
        signUpSaga.execute.mockResolvedValue(err(new InvalidPasswordException()));

        const command = new SignUpCommand('test@example.com', 'testuser', 'weak');
        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(InvalidPasswordException);
      });
    });
  });

  describe('Given the saga throws an infrastructure error', () => {
    describe('When an unexpected error occurs', () => {
      it('Then it propagates the error (not wrapped in Result)', async () => {
        signUpSaga.execute.mockRejectedValue(new Error('DB connection lost'));

        const command = new SignUpCommand('test@example.com', 'testuser', 'Password1');

        await expect(handler.execute(command)).rejects.toThrow('DB connection lost');
      });
    });
  });
});
