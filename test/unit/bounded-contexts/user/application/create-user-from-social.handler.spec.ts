import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateUserFromSocialHandler } from '@user/application/commands/create-user-from-social/create-user-from-social.handler';
import { CreateUserFromSocialCommand } from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { UserAggregate, AccountType } from '@user/domain/models/user.aggregate';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('CreateUserFromSocialHandler', () => {
  let handler: CreateUserFromSocialHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'persist'>>;
  let socialAccountContract: jest.Mocked<Pick<ISocialAccountContract, 'persist'>>;
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const VALID_EMAIL = 'alice@example.com';
  const VALID_USERNAME = 'alice';
  const PROVIDER = 'google';
  const PROVIDER_ID = 'google-uid-123';

  beforeEach(async () => {
    userContract = {
      persist: jest.fn(),
    };

    socialAccountContract = {
      persist: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserFromSocialHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT, useValue: socialAccountContract },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    handler = module.get<CreateUserFromSocialHandler>(CreateUserFromSocialHandler);
  });

  describe('Given valid social provider data', () => {
    beforeEach(() => {
      userContract.persist.mockImplementation((user: UserAggregate) =>
        Promise.resolve(
          UserMother.createSocialOnly({
            id: 1,
            uuid: user.uuid,
            email: user.email,
            username: user.username,
            provider: PROVIDER,
          }),
        ),
      );
      socialAccountContract.persist.mockResolvedValue(
        SocialAccountModel.create({
          id: 1,
          userId: 1,
          provider: PROVIDER,
          providerId: PROVIDER_ID,
          createdAt: new Date(),
        }),
      );
    });

    describe('When creating a user from a social provider', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the user has social account type', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );
        const user = result._unsafeUnwrap();

        expect(user.accountType).toBe(AccountType.SOCIAL);
      });

      it('Then both user and social account are persisted', async () => {
        await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(userContract.persist).toHaveBeenCalledTimes(1);
        expect(socialAccountContract.persist).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 1, provider: PROVIDER, providerId: PROVIDER_ID }),
        );
      });

      it('Then domain events are merged and committed', async () => {
        await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an invalid email format', () => {
    describe('When attempting to create a social user', () => {
      it('Then the result is err with errorCode INVALID_EMAIL', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand('bad-email', VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('INVALID_EMAIL');
      });

      it('Then neither user nor social account are persisted', async () => {
        await handler.execute(
          new CreateUserFromSocialCommand('bad-email', VALID_USERNAME, PROVIDER, PROVIDER_ID),
        );

        expect(userContract.persist).not.toHaveBeenCalled();
        expect(socialAccountContract.persist).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given an invalid username', () => {
    describe('When attempting to create a social user', () => {
      it('Then the result is err with errorCode INVALID_USERNAME', async () => {
        const result = await handler.execute(
          new CreateUserFromSocialCommand(VALID_EMAIL, 'ab', PROVIDER, PROVIDER_ID),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('INVALID_USERNAME');
      });
    });
  });

  describe('Given UserAggregate.createFromSocial throws a non-DomainException error', () => {
    describe('When the handler executes', () => {
      it('Then it re-throws the error without wrapping in Result', async () => {
        const spy = jest.spyOn(UserAggregate, 'createFromSocial').mockImplementationOnce(() => {
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

  describe('Given userContract.persist returns a user without an id', () => {
    describe('When the handler executes', () => {
      it('Then it throws an invariant violation error', async () => {
        userContract.persist.mockResolvedValueOnce(
          { id: undefined, uuid: 'some-uuid', email: VALID_EMAIL, username: VALID_USERNAME } as unknown as ReturnType<typeof userContract.persist> extends Promise<infer T> ? T : never,
        );

        await expect(
          handler.execute(
            new CreateUserFromSocialCommand(VALID_EMAIL, VALID_USERNAME, PROVIDER, PROVIDER_ID),
          ),
        ).rejects.toThrow('Invariant violation: persisted user must have an id');
      });
    });
  });
});
