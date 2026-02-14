import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateUserFromSocialCommand } from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { UserModel } from '@user/domain/models/user.model';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@CommandHandler(CreateUserFromSocialCommand)
export class CreateUserFromSocialHandler implements ICommandHandler<CreateUserFromSocialCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateUserFromSocialCommand): Promise<UserModel> {
    const user = UserModel.createFromSocial({
      email: command.email,
      username: command.username,
      passwordHash: null,
      provider: command.provider,
    });

    const persistedUser = await this.userContract.persist(user);

    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return persistedUser;
  }
}
