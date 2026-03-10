import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { CreateUserFromSocialCommand } from '@user/application/commands/create-user-from-social/create-user-from-social.command';
import { UserAggregate } from '@user/domain/models/user.aggregate';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@CommandHandler(CreateUserFromSocialCommand)
export class CreateUserFromSocialHandler implements ICommandHandler<CreateUserFromSocialCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
    @Inject(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT)
    private readonly socialAccountContract: ISocialAccountContract,
  ) {}

  async execute(command: CreateUserFromSocialCommand): Promise<UserAggregate> {
    const user = UserAggregate.createFromSocial({
      email: command.email,
      username: command.username,
      passwordHash: null,
      provider: command.provider,
    });

    const persistedUser = await this.userContract.persist(user);

    await this.socialAccountContract.persist({
      userId: persistedUser.id!,
      provider: command.provider,
      providerId: command.providerId,
    });

    this.eventPublisher.mergeObjectContext(user);
    user.commit();

    return persistedUser;
  }
}
