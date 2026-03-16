import { Test, TestingModule } from '@nestjs/testing';
import { LinkProviderToUserHandler } from '@user/application/commands/link-provider-to-user/link-provider-to-user.handler';
import { LinkProviderToUserCommand } from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

/**
 * @deprecated LinkProviderToUserHandler is now a compatibility stub.
 * Provider linking is handled by UserFacade.linkSocialAccount().
 */
describe('LinkProviderToUserHandler', () => {
  let handler: LinkProviderToUserHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findById'>>;
  let mediator: { user: { linkSocialAccount: jest.Mock } };

  const USER_ID = 1;
  const PROVIDER = 'google';
  const PROVIDER_ID = 'google-uid-456';

  beforeEach(async () => {
    userContract = {
      findById: jest.fn(),
    };

    mediator = {
      user: {
        linkSocialAccount: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkProviderToUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<LinkProviderToUserHandler>(LinkProviderToUserHandler);
  });

  describe('Given a user exists in the system', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(UserMother.create({ id: USER_ID }));
    });

    describe('When linking a social provider', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new LinkProviderToUserCommand(USER_ID, PROVIDER, PROVIDER_ID),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the facade linkSocialAccount is called with the correct provider data', async () => {
        await handler.execute(new LinkProviderToUserCommand(USER_ID, PROVIDER, PROVIDER_ID));

        expect(mediator.user.linkSocialAccount).toHaveBeenCalledWith(USER_ID, {
          provider: PROVIDER,
          providerId: PROVIDER_ID,
        });
      });
    });
  });

  describe('Given no user exists with the given ID', () => {
    beforeEach(() => {
      userContract.findById.mockResolvedValue(null);
    });

    describe('When attempting to link a provider', () => {
      it('Then the result is err with UserNotFoundException', async () => {
        const result = await handler.execute(
          new LinkProviderToUserCommand(999, PROVIDER, PROVIDER_ID),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(UserNotFoundException);
        expect(result._unsafeUnwrapErr().errorCode).toBe('USER_NOT_FOUND');
      });

      it('Then the facade is not called', async () => {
        await handler.execute(new LinkProviderToUserCommand(999, PROVIDER, PROVIDER_ID));

        expect(mediator.user.linkSocialAccount).not.toHaveBeenCalled();
      });

      it('Then no exception escapes — the error is returned as a Result', async () => {
        await expect(
          handler.execute(new LinkProviderToUserCommand(999, PROVIDER, PROVIDER_ID)),
        ).resolves.not.toThrow();
      });
    });
  });
});
