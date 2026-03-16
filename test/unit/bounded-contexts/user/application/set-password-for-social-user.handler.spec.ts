import { Test, TestingModule } from '@nestjs/testing';
import { SetPasswordForSocialUserHandler } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.handler';
import { SetPasswordForSocialUserCommand } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

/**
 * @deprecated SetPasswordForSocialUserHandler is now a compatibility stub.
 * Password updates are handled by UserFacade.updatePasswordHash() via CredentialAccount.
 */
describe('SetPasswordForSocialUserHandler', () => {
  let handler: SetPasswordForSocialUserHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findById'>>;
  let mediator: {
    user: {
      findUserByUUIDWithCredential: jest.Mock;
      updatePasswordHash: jest.Mock;
    };
  };

  const USER_ID = 1;
  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const NEW_PASSWORD_HASH = '$2b$12$newhashedpassword';

  beforeEach(async () => {
    userContract = {
      findById: jest.fn(),
    };

    mediator = {
      user: {
        findUserByUUIDWithCredential: jest.fn(),
        updatePasswordHash: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetPasswordForSocialUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<SetPasswordForSocialUserHandler>(SetPasswordForSocialUserHandler);
  });

  describe('Given a user exists with a credential', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(UserMother.create({ id: USER_ID, uuid: USER_UUID }));
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue({
        user: UserMother.create({ id: USER_ID, uuid: USER_UUID }),
        credential: CredentialAccountMother.createSocialOnly({ id: 5, accountId: 10 }),
      });
    });

    describe('When setting a password for the user', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then updatePasswordHash is called on the facade with the credential id', async () => {
        await handler.execute(new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH));

        expect(mediator.user.updatePasswordHash).toHaveBeenCalledWith(5, NEW_PASSWORD_HASH);
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

      it('Then the facade is not called', async () => {
        await handler.execute(new SetPasswordForSocialUserCommand(999, NEW_PASSWORD_HASH));

        expect(mediator.user.findUserByUUIDWithCredential).not.toHaveBeenCalled();
        expect(mediator.user.updatePasswordHash).not.toHaveBeenCalled();
      });

      it('Then no exception escapes — the error is returned as a Result', async () => {
        await expect(
          handler.execute(new SetPasswordForSocialUserCommand(999, NEW_PASSWORD_HASH)),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Given the user exists but credential lookup returns null', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(UserMother.create({ id: USER_ID, uuid: USER_UUID }));
      mediator.user.findUserByUUIDWithCredential.mockResolvedValue(null);
    });

    describe('When attempting to set a password', () => {
      it('Then the result is err with UserNotFoundException', async () => {
        const result = await handler.execute(
          new SetPasswordForSocialUserCommand(USER_ID, NEW_PASSWORD_HASH),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserNotFoundException);
      });
    });
  });
});
