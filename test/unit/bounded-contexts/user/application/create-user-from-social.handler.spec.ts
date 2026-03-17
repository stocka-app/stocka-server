import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateUserFromSocialHandler } from '@user/application/commands/create-user-from-social/create-user-from-social.handler';
import { CreateUserFromSocialCommand } from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

/**
 * @deprecated CreateUserFromSocialHandler is now a compatibility stub.
 * Social user creation is handled transactionally by UserFacade.createUserFromOAuth().
 * This handler only persists the UserAggregate anchor.
 */
describe('CreateUserFromSocialHandler', () => {
  let handler: CreateUserFromSocialHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'persist'>>;
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const VALID_EMAIL = 'alice@example.com';
  const VALID_USERNAME = 'alice';
  const PROVIDER = 'google';
  const PROVIDER_ID = 'google-uid-123';

  beforeEach(async () => {
    userContract = {
      persist: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserFromSocialHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    handler = module.get<CreateUserFromSocialHandler>(CreateUserFromSocialHandler);
  });

  describe('Given valid social provider data', () => {
    beforeEach(() => {
      userContract.persist.mockImplementation((user: UserAggregate) =>
        Promise.resolve(UserMother.create({ id: 1, uuid: user.uuid })),
      );
    });

    describe('When creating a user via the deprecated social handler', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the persisted user is a UserAggregate anchor with id and uuid', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );
        const user = result._unsafeUnwrap();

        expect(user.id).toBe(1);
        expect(user.uuid).toBeDefined();
      });

      it('Then the user is persisted via userContract', async () => {
        await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(userContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then domain events are merged and committed', async () => {
        await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given UserAggregate.create throws a DomainException', () => {
    describe('When the handler executes', () => {
      it('Then it returns an err Result wrapping the domain exception', async () => {
        const domainError = new UserNotFoundException('alice@example.com');
        const spy = jest.spyOn(UserAggregate, 'create').mockImplementationOnce(() => {
          throw domainError;
        });

        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBe(domainError);

        spy.mockRestore();
      });
    });
  });

  describe('Given UserAggregate.create throws a non-DomainException error', () => {
    describe('When the handler executes', () => {
      it('Then it re-throws the error without wrapping in Result', async () => {
        const spy = jest.spyOn(UserAggregate, 'create').mockImplementationOnce(() => {
          throw new Error('unexpected infrastructure error');
        });

        await expect(
          handler.execute(
            new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
          ),
        ).rejects.toThrow('unexpected infrastructure error');

        spy.mockRestore();
      });
    });
  });
});
