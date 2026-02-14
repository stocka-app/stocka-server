import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserCommand } from '@user/application/commands/create-user/create-user.command';
import { UserModel } from '@user/domain/models/user.model';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserModel> {
    const user = UserModel.create({
      email: command.email,
      username: command.username,
      passwordHash: command.passwordHash,
    });

    const persistedUser = await this.userContract.persist(user);

    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return persistedUser;
  }
}
