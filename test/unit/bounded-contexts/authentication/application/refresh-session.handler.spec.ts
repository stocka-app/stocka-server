import { Test, TestingModule } from '@nestjs/testing';
import { RefreshSessionHandler } from '@authentication/application/commands/refresh-session/refresh-session.handler';
import { RefreshSessionCommand } from '@authentication/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionSaga } from '@authentication/application/sagas/refresh-session/refresh-session.saga';
import { TokenExpiredException } from '@authentication/domain/exceptions/token-expired.exception';
import { ok, err } from '@shared/domain/result';

describe('RefreshSessionHandler', () => {
  let handler: RefreshSessionHandler;
  let saga: { execute: jest.Mock };

  const REFRESH_TOKEN = 'valid.refresh.token';

  beforeEach(async () => {
    saga = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshSessionHandler, { provide: RefreshSessionSaga, useValue: saga }],
    }).compile();

    handler = module.get<RefreshSessionHandler>(RefreshSessionHandler);
  });

  describe('Given the saga completes successfully', () => {
    beforeEach(() => {
      saga.execute.mockResolvedValue(
        ok({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }),
      );
    });

    describe('When the handler executes with a valid refresh token', () => {
      it('Then it delegates to the saga with the correct input', async () => {
        await handler.execute(new RefreshSessionCommand(REFRESH_TOKEN));
        expect(saga.execute).toHaveBeenCalledWith({ refreshToken: REFRESH_TOKEN });
      });

      it('Then it returns the saga result directly', async () => {
        const result = await handler.execute(new RefreshSessionCommand(REFRESH_TOKEN));
        expect(result.isOk()).toBe(true);
        const data = result._unsafeUnwrap();
        expect(data.accessToken).toBe('new-access-token');
        expect(data.refreshToken).toBe('new-refresh-token');
      });
    });
  });

  describe('Given the saga returns a domain error', () => {
    beforeEach(() => {
      saga.execute.mockResolvedValue(err(new TokenExpiredException()));
    });

    describe('When the token is expired', () => {
      it('Then the handler returns the err Result', async () => {
        const result = await handler.execute(new RefreshSessionCommand('expired.token'));
        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(TokenExpiredException);
      });
    });
  });

  describe('Given the saga throws an unexpected error', () => {
    beforeEach(() => {
      saga.execute.mockRejectedValue(new Error('Database connection lost'));
    });

    describe('When an infrastructure error occurs', () => {
      it('Then the error propagates without being wrapped in a Result', async () => {
        await expect(handler.execute(new RefreshSessionCommand(REFRESH_TOKEN))).rejects.toThrow(
          'Database connection lost',
        );
      });
    });
  });
});
