import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByEmailHandler } from '@user/application/queries/find-user-by-email/find-user-by-email.handler';
import { FindUserByEmailQuery } from '@user/application/queries/find-user-by-email/find-user-by-email.query';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { UserMother, CredentialAccountMother } from '@test/helpers/object-mother/user.mother';

describe('FindUserByEmailHandler', () => {
  let handler: FindUserByEmailHandler;
  let mediator: { user: { findUserByEmail: jest.Mock } };

  const KNOWN_EMAIL = 'alice@example.com';
  const UNKNOWN_EMAIL = 'nobody@example.com';

  beforeEach(async () => {
    mediator = {
      user: {
        findUserByEmail: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByEmailHandler,
        { provide: MediatorService, useValue: mediator },
      ],
    }).compile();

    handler = module.get<FindUserByEmailHandler>(FindUserByEmailHandler);
  });

  describe('Given a user with the email exists', () => {
    beforeEach(() => {
      mediator.user.findUserByEmail.mockResolvedValue({
        user: UserMother.create({ id: 1 }),
        credential: CredentialAccountMother.createVerified({ email: KNOWN_EMAIL }),
      });
    });

    describe('When querying by that email', () => {
      it('Then the result is ok with the UserAggregate', async () => {
        const result = await handler.execute(new FindUserByEmailQuery(KNOWN_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()!.id).toBe(1);
      });

      it('Then the mediator is called with the exact email', async () => {
        await handler.execute(new FindUserByEmailQuery(KNOWN_EMAIL));

        expect(mediator.user.findUserByEmail).toHaveBeenCalledWith(KNOWN_EMAIL);
        expect(mediator.user.findUserByEmail).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no user exists with that email', () => {
    beforeEach(() => {
      mediator.user.findUserByEmail.mockResolvedValue(null);
    });

    describe('When querying by that email', () => {
      it('Then the result is ok with null (not an error)', async () => {
        const result = await handler.execute(new FindUserByEmailQuery(UNKNOWN_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()).toBeNull();
      });
    });
  });
});
