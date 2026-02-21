import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { SetPasswordForSocialUserCommand } from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@CommandHandler(SetPasswordForSocialUserCommand)
export class SetPasswordForSocialUserHandler
  implements ICommandHandler<SetPasswordForSocialUserCommand>
{
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: SetPasswordForSocialUserCommand): Promise<void> {
    const user = await this.userContract.findById(command.userId);
    if (!user) return;

    this.eventPublisher.mergeObjectContext(user);
    user.setPasswordAndBecomeFlexible(command.passwordHash);
    await this.userContract.persist(user);
    user.commit();
  }
}
