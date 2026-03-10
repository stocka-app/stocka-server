import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateUserHandler } from '@user/application/commands/create-user/create-user.handler';
import { CreateUserCommand } from '@user/application/commands/create-user/create-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserMother } from '@test/helpers/object-mother/user.mother';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userContract: jest.Mocked<Pick<IUserContract, 'persist'>>;
  let eventPublisher: { mergeObjectContext: jest.Mock };

  const VALID_EMAIL = 'alice@example.com';
  const VALID_USERNAME = 'alice';
  const VALID_HASH = '$2b$12$hashedpassword';

  beforeEach(async () => {
    userContract = {
      persist: jest.fn(),
    };

    eventPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((obj) => obj),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: INJECTION_TOKENS.USER_CONTRACT, useValue: userContract },
        { provide: EventPublisher, useValue: eventPublisher },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
  });

  describe('Given valid user registration data', () => {
    beforeEach(() => {
      userContract.persist.mockImplementation((user: UserAggregate) =>
        Promise.resolve(
          UserMother.create({
            id: 1,
            uuid: user.uuid,
            email: user.email,
            username: user.username,
            passwordHash: user.passwordHash,
          }),
        ),
      );
    });

    describe('When creating a new manual user', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the persisted user contains the correct data', async () => {
        const result = await handler.execute(
          new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH),
        );
        const user = result._unsafeUnwrap();

        expect(user.email).toBe(VALID_EMAIL);
        expect(user.username).toBe(VALID_USERNAME);
        expect(user.passwordHash).toBe(VALID_HASH);
      });

      it('Then the user contract persist is called once', async () => {
        await handler.execute(new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH));

        expect(userContract.persist).toHaveBeenCalledTimes(1);
      });

      it('Then domain events are merged and committed via the publisher', async () => {
        await handler.execute(new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH));

        expect(eventPublisher.mergeObjectContext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Given an invalid email format', () => {
    describe('When attempting to create the user', () => {
      it('Then the result is err with errorCode INVALID_EMAIL', async () => {
        const result = await handler.execute(
          new CreateUserCommand('not-an-email', VALID_USERNAME, VALID_HASH),
        );

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('INVALID_EMAIL');
      });

      it('Then no user is persisted', async () => {
        await handler.execute(new CreateUserCommand('not-an-email', VALID_USERNAME, VALID_HASH));

        expect(userContract.persist).not.toHaveBeenCalled();
      });

      it('Then no exception escapes — the error is returned as a Result', async () => {
        await expect(
          handler.execute(new CreateUserCommand('not-an-email', VALID_USERNAME, VALID_HASH)),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Given an invalid username (too short)', () => {
    describe('When attempting to create the user', () => {
      it('Then the result is err with errorCode INVALID_USERNAME', async () => {
        const result = await handler.execute(new CreateUserCommand(VALID_EMAIL, 'ab', VALID_HASH));

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr().errorCode).toBe('INVALID_USERNAME');
      });

      it('Then no user is persisted', async () => {
        await handler.execute(new CreateUserCommand(VALID_EMAIL, 'ab', VALID_HASH));

        expect(userContract.persist).not.toHaveBeenCalled();
      });
    });
  });
});
