import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByEmailOrUsernameHandler } from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.handler';
import { FindUserByEmailOrUsernameQuery } from '@user/application/queries/find-user-by-email-or-username/find-user-by-email-or-username.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('FindUserByEmailOrUsernameHandler', () => {
  let handler: FindUserByEmailOrUsernameHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findByEmailOrUsername'>>;

  const KNOWN_EMAIL = 'alice@example.com';
  const KNOWN_USERNAME = 'alice';
  const UNKNOWN_IDENTIFIER = 'ghost@nowhere.com';

  beforeEach(async () => {
    userContract = {
      findByEmailOrUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByEmailOrUsernameHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<FindUserByEmailOrUsernameHandler>(FindUserByEmailOrUsernameHandler);
  });

  describe('Given a user with the email exists', () => {
    beforeEach(() => {
      userContract.findByEmailOrUsername.mockResolvedValue(
        UserMother.create({ email: KNOWN_EMAIL, username: KNOWN_USERNAME }),
      );
    });

    describe('When querying by email', () => {
      it('Then the result is ok with the matching user', async () => {
        const result = await handler.execute(new FindUserByEmailOrUsernameQuery(KNOWN_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()!.email).toBe(KNOWN_EMAIL);
      });
    });

    describe('When querying by username', () => {
      it('Then the result is ok with the matching user', async () => {
        const result = await handler.execute(new FindUserByEmailOrUsernameQuery(KNOWN_USERNAME));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()!.username).toBe(KNOWN_USERNAME);
      });

      it('Then the contract is called with the exact identifier', async () => {
        await handler.execute(new FindUserByEmailOrUsernameQuery(KNOWN_USERNAME));

        expect(userContract.findByEmailOrUsername).toHaveBeenCalledWith(KNOWN_USERNAME);
        expect(userContract.findByEmailOrUsername).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no user matches the identifier', () => {
    beforeEach(() => {
      userContract.findByEmailOrUsername.mockResolvedValue(null);
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
