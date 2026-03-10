import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByEmailHandler } from '@user/application/queries/find-user-by-email/find-user-by-email.handler';
import { FindUserByEmailQuery } from '@user/application/queries/find-user-by-email/find-user-by-email.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('FindUserByEmailHandler', () => {
  let handler: FindUserByEmailHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findByEmail'>>;

  const KNOWN_EMAIL = 'alice@example.com';
  const UNKNOWN_EMAIL = 'nobody@example.com';

  beforeEach(async () => {
    userContract = {
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByEmailHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<FindUserByEmailHandler>(FindUserByEmailHandler);
  });

  describe('Given a user with the email exists', () => {
    beforeEach(() => {
      userContract.findByEmail.mockResolvedValue(
        UserMother.create({ email: KNOWN_EMAIL, username: 'alice' }),
      );
    });

    describe('When querying by that email', () => {
      it('Then the result is ok with the user', async () => {
        const result = await handler.execute(new FindUserByEmailQuery(KNOWN_EMAIL));

        expect(result.isOk()).toBe(true);
        expect(result._unsafeUnwrap()!.email).toBe(KNOWN_EMAIL);
      });

      it('Then the contract is called with the exact email', async () => {
        await handler.execute(new FindUserByEmailQuery(KNOWN_EMAIL));

        expect(userContract.findByEmail).toHaveBeenCalledWith(KNOWN_EMAIL);
        expect(userContract.findByEmail).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given no user exists with that email', () => {
    beforeEach(() => {
      userContract.findByEmail.mockResolvedValue(null);
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
