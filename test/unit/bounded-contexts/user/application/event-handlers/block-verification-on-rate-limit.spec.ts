import { BlockVerificationOnRateLimitHandler } from '@user/application/event-handlers/block-verification-on-rate-limit.handler';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

describe('BlockVerificationOnRateLimitHandler', () => {
  let handler: BlockVerificationOnRateLimitHandler;
  let mediator: { user: { findUserByUUIDWithCredential: jest.Mock; blockVerification: jest.Mock } };

  beforeEach(() => {
    mediator = {
      user: {
        findUserByUUIDWithCredential: jest.fn(),
        blockVerification: jest.fn(),
      },
    };
    handler = new BlockVerificationOnRateLimitHandler(mediator as unknown as MediatorService);
  });

  const blockedUntil = new Date('2026-04-01T00:00:00Z');
  const event = new UserVerificationBlockedByAuthenticationEvent('user-uuid-1', blockedUntil);

  describe('Given a valid event and the user exists', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.blockVerification.mockResolvedValue(undefined);
    });

    describe('When handle is called', () => {
      it('Then it calls blockVerification with the credential id and blockedUntil date', async () => {
        await handler.handle(event);

        expect(mediator.user.findUserByUUIDWithCredential).toHaveBeenCalledWith('user-uuid-1');
        expect(mediator.user.blockVerification).toHaveBeenCalledWith(42, blockedUntil);
      });
    });
  });

  describe('Given a valid event but the user is NOT found', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue(null);
    });

    describe('When handle is called', () => {
      it('Then it returns silently without calling blockVerification', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();

        expect(mediator.user.blockVerification).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given a valid event, user exists, but blockVerification throws an Error', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.blockVerification.mockRejectedValue(new Error('DB connection lost'));
    });

    describe('When handle is called', () => {
      it('Then it catches the error and returns silently (no crash)', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given a valid event, user exists, but blockVerification throws a non-Error value', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.blockVerification.mockRejectedValue('string rejection');
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error value and returns silently', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given a valid event but the credential has no id', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: undefined },
      });
    });

    describe('When handle is called', () => {
      it('Then it returns silently without calling blockVerification', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();

        expect(mediator.user.blockVerification).not.toHaveBeenCalled();
      });
    });
  });
});
