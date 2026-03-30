import { UpdatePasswordOnResetHandler } from '@user/application/event-handlers/update-password-on-reset.handler';
import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

describe('UpdatePasswordOnResetHandler', () => {
  let handler: UpdatePasswordOnResetHandler;
  let mediator: { user: { updatePasswordHash: jest.Mock } };

  beforeEach(() => {
    mediator = { user: { updatePasswordHash: jest.fn() } };
    handler = new UpdatePasswordOnResetHandler(mediator as unknown as MediatorService);
    jest.spyOn((handler as any).logger, 'log').mockImplementation();
    jest.spyOn((handler as any).logger, 'warn').mockImplementation();
  });

  const event = new UserPasswordResetByAuthenticationEvent(42, 'new-hashed-password');

  describe('Given the password update succeeds', () => {
    beforeEach(() => {
      mediator.user.updatePasswordHash.mockResolvedValue(undefined);
    });

    describe('When handle is called', () => {
      it('Then it updates the password hash via the mediator', async () => {
        await handler.handle(event);

        expect(mediator.user.updatePasswordHash).toHaveBeenCalledWith(42, 'new-hashed-password');
      });
    });
  });

  describe('Given the password update throws an Error', () => {
    beforeEach(() => {
      mediator.user.updatePasswordHash.mockRejectedValue(new Error('DB connection lost'));
    });

    describe('When handle is called', () => {
      it('Then it catches the error and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });

  describe('Given the password update throws a non-Error value', () => {
    beforeEach(() => {
      mediator.user.updatePasswordHash.mockRejectedValue('string rejection');
    });

    describe('When handle is called', () => {
      it('Then it catches the non-Error value and does not crash', async () => {
        await expect(handler.handle(event)).resolves.toBeUndefined();
      });
    });
  });
});
