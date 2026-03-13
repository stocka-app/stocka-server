import { Test, TestingModule } from '@nestjs/testing';
import { ResetPasswordHandler } from '@authentication/application/commands/reset-password/reset-password.handler';
import { ResetPasswordCommand } from '@authentication/application/commands/reset-password/reset-password.command';
import { ResetPasswordSaga } from '@authentication/application/sagas/reset-password/reset-password.saga';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { ok, err } from '@shared/domain/result';

describe('ResetPasswordHandler — password reset via token (EC-007)', () => {
  let handler: ResetPasswordHandler;
  let saga: { execute: jest.Mock };

  const command = new ResetPasswordCommand('valid-reset-token', 'NewSecurePass!123');

  const sagaOutput = { message: 'Password has been reset successfully' };

  beforeEach(async () => {
    const mockSaga = {
      execute: jest.fn().mockResolvedValue(ok(sagaOutput)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordHandler,
        { provide: ResetPasswordSaga, useValue: mockSaga },
      ],
    }).compile();

    handler = module.get<ResetPasswordHandler>(ResetPasswordHandler);
    saga = module.get(ResetPasswordSaga);
  });

  describe('Given a customer who submits a valid reset token and a strong new password', () => {
    describe('When the saga completes successfully', () => {
      it('Then the handler delegates the command to the saga with the correct context', async () => {
        await handler.execute(command);

        expect(saga.execute).toHaveBeenCalledWith({
          token: 'valid-reset-token',
          newPassword: 'NewSecurePass!123',
        });
      });

      it('Then the handler returns the success message from the saga output', async () => {
        const result = await handler.execute(command);

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap().message).toBe('Password has been reset successfully');
      });
    });
  });

  describe('Given the token is expired or already used', () => {
    describe('When the saga returns a TokenExpiredException', () => {
      it('Then the handler propagates the err Result to the caller', async () => {
        saga.execute.mockResolvedValue(err(new TokenExpiredException()));

        const result = await handler.execute(command);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TokenExpiredException);
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
