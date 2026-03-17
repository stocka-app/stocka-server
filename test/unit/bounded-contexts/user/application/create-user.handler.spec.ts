import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { CreateUserHandler } from '@user/application/commands/create-user/create-user.handler';
import { CreateUserCommand } from '@user/application/commands/create-user/create-user.command';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
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
          }),
        ),
      );
    });

    describe('When creating a new user', () => {
      it('Then the result is ok', async () => {
        const result = await handler.execute(
          new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH),
        );

        expect(result.isOk()).toBe(true);
      });

      it('Then the persisted user has an id and uuid', async () => {
        const result = await handler.execute(
          new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH),
        );
        const user = result._unsafeUnwrap();

        expect(user.id).toBe(1);
        expect(user.uuid).toBeDefined();
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

  describe('Given UserAggregate.create throws a DomainException', () => {
    describe('When the handler executes', () => {
      it('Then it returns an err Result wrapping the domain exception', async () => {
        const domainError = new UserNotFoundException('alice@example.com');
        const spy = jest.spyOn(UserAggregate, 'create').mockImplementationOnce(() => {
          throw domainError;
        });

        const result = await handler.execute(
          new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH),
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
          handler.execute(new CreateUserCommand(VALID_EMAIL, VALID_USERNAME, VALID_HASH)),
        ).rejects.toThrow('unexpected infrastructure error');

        spy.mockRestore();
      });
    });
  });
});
