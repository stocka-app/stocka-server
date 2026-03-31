import { VerifyUserEmailOnVerificationCompletedHandler } from '@user/application/event-handlers/verify-user-email-on-verification-completed.handler';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

describe('VerifyUserEmailOnVerificationCompletedHandler', () => {
  let handler: VerifyUserEmailOnVerificationCompletedHandler;
  let mediator: { user: { findUserByUUIDWithCredential: jest.Mock; verifyEmail: jest.Mock } };

  beforeEach(() => {
    mediator = {
      user: {
        findUserByUUIDWithCredential: jest.fn(),
        verifyEmail: jest.fn(),
      },
    };
    handler = new VerifyUserEmailOnVerificationCompletedHandler(
      mediator as unknown as MediatorService,
    );
    jest.spyOn((handler as any).logger, 'log').mockImplementation();
    jest.spyOn((handler as any).logger, 'warn').mockImplementation();
  });

  const event = new EmailVerificationCompletedEvent('user-uuid-1', 'test@example.com');

  describe('Given the user exists with a credential', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.verifyEmail.mockResolvedValue(undefined);
    });

    describe('When handle is called', () => {
      it('Then it verifies the email via the mediator', async () => {
        await handler.handle(event);

        expect(mediator.user.findUserByUUIDWithCredential).toHaveBeenCalledWith('user-uuid-1');
        expect(mediator.user.verifyEmail).toHaveBeenCalledWith(42);
      });
    });
  });

  describe('Given the user is NOT found', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue(null);
    });

    describe('When handle is called', () => {
      it('Then it returns without calling verifyEmail', async () => {
        await handler.handle(event);

        expect(mediator.user.verifyEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given verifyEmail throws an Error', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.verifyEmail.mockRejectedValue(new Error('DB error'));
    });

    describe('When handle is called', () => {
      it('Then it catches the error and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given verifyEmail throws a non-Error value', () => {
    beforeEach(() => {
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: { uuid: 'user-uuid-1' },
        credential: { id: 42 },
      });
      mediator.user.verifyEmail.mockRejectedValue('string error');
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error value and does not crash', async () => {
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
      it('Then it returns silently without calling verifyEmail', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();

        expect(mediator.user.verifyEmail).not.toHaveBeenCalled();
      });
    });
  });
});
