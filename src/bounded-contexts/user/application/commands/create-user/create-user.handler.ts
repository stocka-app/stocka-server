import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  CreateUserCommand,
  CreateUserCommandResult,
} from '@user/application/commands/create-user/create-user.command';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { ok, err } from '@shared/domain/result';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserCommandResult> {
    // Note: user creation with credentials is now handled by UserFacade.createUserWithCredentials().
    // This handler remains for backward compatibility with any in-flight commands.
    let user: UserAggregate;
    try {
      user = UserAggregate.create();
    } catch (e) {
      if (e instanceof DomainException) return err(e);
      throw e;
    }

    const persistedUser = await this.userContract.persist(user);

    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return ok(persistedUser);
  }
}
