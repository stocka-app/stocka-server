import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByEmailOrUsernameHandler } from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.handler';
import { FindUserByEmailOrUsernameQuery } from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.query';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

describe('FindUserByEmailOrUsernameHandler', () => {
  let handler: FindUserByEmailOrUsernameHandler;
  let mediator: { user: { findUserByEmailOrUsername: jest.Mock } };

  const KNOWN_EMAIL = 'alice@example.com';
  const KNOWN_USERNAME = 'alice';
  const UNKNOWN_IDENTIFIER = 'ghost@nowhere.com';

  beforeEach(async () => {
    mediator = {
      user: {
        findUserByEmailOrUsername: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByEmailOrUsernameHandler,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<FindUserByEmailOrUsernameHandler>(FindUserByEmailOrUsernameHandler);
  });

  describe('Given a user with the email exists', () => {
    beforeEach(() => {
      mediator.user.findUserByEmailOrUsername.mockResolvedValue({
        user: UserMother.create({ id: 1 }),
        credential: CredentialAccountMother.createVerified({ email: KNOWN_EMAIL }),
      });
    });

    describe('When querying by email', () => {
      it('Then the result is ok with the UserAggregate', async () => {
        const result = await handler.execute(new FindUserByEmailOrUsernameQuery(KNOWN_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()!.id).toBe(1);
      });
    });

    describe('When querying by username', () => {
      it('Then the mediator is called with the identifier', async () => {
        await handler.execute(new FindUserByEmailOrUsernameQuery(KNOWN_USERNAME));

        expect(mediator.user.findUserByEmailOrUsername).toHaveBeenCalledWith(KNOWN_USERNAME);
        expect(mediator.user.findUserByEmailOrUsername).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no user matches the identifier', () => {
    beforeEach(() => {
      mediator.user.findUserByEmailOrUsername.mockResolvedValue(null);
    });

    describe('When querying by that identifier', () => {
      it('Then the result is ok with null (not an error)', async () => {
        const result = await handler.execute(
          new FindUserByEmailOrUsernameQuery(UNKNOWN_IDENTIFIER),
        );

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeNull();
      });
    });
  });
});
