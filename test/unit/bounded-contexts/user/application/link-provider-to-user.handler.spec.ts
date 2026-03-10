import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { LinkProviderToUserHandler } from '@user/application/commands/link-provider-to-user/link-provider-to-user.handler';
import { LinkProviderToUserCommand } from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { AccountType } from '@user/domain/models/user.aggregate';
import { SocialAccountModel } from '@user/domain/models/social-account.model';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('LinkProviderToUserHandler', () => {
  let handler: LinkProviderToUserHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findById' | 'persist'>>;
  let socialAccountContract: jest.Mocked<Pick<ISocialAccountContract, 'persist'>>;
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const USER_ID = 1;
  const PROVIDER = 'google';
  const PROVIDER_ID = 'google-uid-456';

  beforeEach(async () => {
    userContract = {
      findById: jest.fn(),
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
        LinkProviderToUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT, useValue: socialAccountContract },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    handler = module.get<LinkProviderToUserHandler>(LinkProviderToUserHandler);
  });

  describe('Given a manual user with a password exists', () => {
    beforeEach(() => {
      const user = UserMother.create({ id: USER_ID, accountType: AccountType.MANUAL });
      userContract.findById.mockResolvedValue(user);
      userContract.persist.mockResolvedValue(user);
      socialAccountContract.persist.mockResolvedValue(
        SocialAccountModel.create({
          id: 1,
          userId: USER_ID,
          provider: PROVIDER,
          providerId: PROVIDER_ID,
          createdAt: new Date(),
        }),
      );
    });

    describe('When linking a social provider', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new LinkProviderToUserCommand(USER_ID, PROVIDER, PROVIDER_ID),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the social account is persisted', async () => {
        await handler.execute(new LinkProviderToUserCommand(USER_ID, PROVIDER, PROVIDER_ID));

        expect(socialAccountContract.persist).toHaveBeenCalledWith(
          expect.objectContaining({ userId: USER_ID, provider: PROVIDER, providerId: PROVIDER_ID }),
        );
      });

      it('Then the user becomes flexible (manual + provider)', async () => {
        await handler.execute(new LinkProviderToUserCommand(USER_ID, PROVIDER, PROVIDER_ID));

        expect(userContract.persist).toHaveBeenCalledTimes(1);
        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given a social-only user exists (no password)', () => {
    beforeEach(() => {
      const user = UserMother.createSocialOnly({ id: USER_ID });
      userContract.findById.mockResolvedValue(user);
      socialAccountContract.persist.mockResolvedValue(
        SocialAccountModel.create({
          id: 1,
          userId: USER_ID,
          provider: 'facebook',
          providerId: 'fb-uid-789',
          createdAt: new Date(),
        }),
      );
    });

    describe('When linking another provider', () => {
      it('Then the result is ok and no flexible upgrade happens', async () => {
        const result = await handler.execute(
          new LinkProviderToUserCommand(USER_ID, 'facebook', 'fb-uid-789'),
        );

        expect(result.isOk()).toBe(true);
        // Social account type stays — becomeFlexible only triggers for MANUAL + hasPassword
        expect(userContract.persist).not.toHaveBeenCalled();
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

      it('Then no social account is persisted', async () => {
        await handler.execute(new LinkProviderToUserCommand(999, PROVIDER, PROVIDER_ID));

        expect(socialAccountContract.persist).not.toHaveBeenCalled();
      });

      it('Then no exception escapes — the error is returned as a Result', async () => {
        await expect(
          handler.execute(new LinkProviderToUserCommand(999, PROVIDER, PROVIDER_ID)),
        ).resolves.not.toThrow();
      });
    });
  });
});
