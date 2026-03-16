import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByUUIDHandler } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.handler';
import { FindUserByUUIDQuery } from '@user/application/queries/find-user-by-uuid/find-user-by-uuid.query';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('FindUserByUUIDHandler', () => {
  let handler: FindUserByUUIDHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'findByUUID'>>;

  const USER_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const UNKNOWN_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  beforeEach(async () => {
    userContract = {
      findByUUID: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByUUIDHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
      ],
    }).compile();

    handler = module.get<FindUserByUUIDHandler>(FindUserByUUIDHandler);
  });

  describe('Given a registered user exists in the system', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(UserMother.create({ uuid: USER_UUID, id: 1 }));
    });

    describe('When fetching their profile by UUID', () => {
      it('Then the result is successful', async () => {
        const result = await handler.execute(new FindUserByUUIDQuery(USER_UUID));

        expect(result.isOk()).toBe(true);
      });

      it('Then the result value contains the correct uuid', async () => {
        const result = await handler.execute(new FindUserByUUIDQuery(USER_UUID));
        const user = result._unsafeUnwrap();

        expect(user.uuid).toBe(USER_UUID);
      });

      it('Then the user contract is called with the exact UUID', async () => {
        await handler.execute(new FindUserByUUIDQuery(USER_UUID));

        expect(userContract.findByUUID).toHaveBeenCalledWith(USER_UUID);
        expect(userContract.findByUUID).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given the UUID does not match any registered user', () => {
    beforeEach(() => {
      userContract.findByUUID.mockResolvedValue(null);
    });

    describe('When fetching a profile with that UUID', () => {
      it('Then the result is a failure', async () => {
        const result = await handler.execute(new FindUserByUUIDQuery(UNKNOWN_UUID));

        expect(result.isErr()).toBe(true);
      });

      it('Then the error is a UserNotFoundException with errorCode USER_NOT_FOUND', async () => {
        const result = await handler.execute(new FindUserByUUIDQuery(UNKNOWN_UUID));
        const error = result._unsafeUnwrapErr();

        expect(error).toBeInstanceOf(UserNotFoundException);
        expect(error.errorCode).toBe('USER_NOT_FOUND');
        expect(error.message).toContain(UNKNOWN_UUID);
      });

      it('Then no exception escapes — the error is returned as a value, not thrown', async () => {
        await expect(handler.execute(new FindUserByUUIDQuery(UNKNOWN_UUID))).resolves.not.toThrow();
      });
    });
  });
});
