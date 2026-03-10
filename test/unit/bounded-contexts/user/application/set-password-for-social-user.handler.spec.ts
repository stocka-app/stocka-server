import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { SetPasswordForSocialUserHandler } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.handler';
import { SetPasswordForSocialUserCommand } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('SetPasswordForSocialUserHandler', () => {
  let handler: SetPasswordForSocialUserHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findById' | 'persist'>>;
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const USER_ID = 1;
  const NEW_PASSWORD_HASH = '$2b$12$newhashedpassword';

  beforeEach(async () => {
    userContract = {
      findById: jest.fn(),
      persist: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetPasswordForSocialUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    handler = module.get<SetPasswordForSocialUserHandler>(SetPasswordForSocialUserHandler);
  });

  describe('Given a social-only user exists', () => {
    beforeEach(() => {
      const user = UserMother.createSocialOnly({ id: USER_ID });
      userContract.findById.mockResolvedValue(user);
      userContract.persist.mockResolvedValue(UserMother.createSocialOnly({ id: USER_ID }));
    });

    describe('When setting a password for the social user', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the user is persisted with the updated password', async () => {
        await handler.execute(new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH));

        expect(userContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then domain events are merged and committed', async () => {
        await handler.execute(new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH));

        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no user exists with the given ID', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(null);
    });

    describe('When attempting to set a password', () => {
      it('Then the result is err with UserNotFoundException', async () => {
        const result = await handler.execute(
          new SetPasswordForSocialUserCommand(999, NEW_PASSWORD_HASH),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserNotFoundException);
        expect(result._unsafeUnwrapErr().errorCode).toBe('USER_NOT_FOUND');
      });

      it('Then no user is persisted', async () => {
        await handler.execute(new SetPasswordForSocialUserCommand(999, NEW_PASSWORD_HASH));

        expect(userContract.persist).not.toHaveBeenCalled();
      });

      it('Then no exception escapes — the error is returned as a Result', async () => {
        await expect(
          handler.execute(new SetPasswordForSocialUserCommand(999, NEW_PASSWORD_HASH)),
        ).resolves.not.toThrow();
      });
    });
  });
});
