import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  SetPasswordForSocialUserCommand,
  SetPasswordForSocialUserCommandResult,
} from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@CommandHandler(SetPasswordForSocialUserCommand)
export class SetPasswordForSocialUserHandler
  implements ICommandHandler<SetPasswordForSocialUserCommand>
{
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: SetPasswordForSocialUserCommand): Promise<SetPasswordForSocialUserCommandResult> {
    const user = await this.userContract.findById(command.userId);
    if (!user) return err(new UserNotFoundException(String(command.userId)));

    this.eventPublisher.mergeObjectContext(user);
    user.setPasswordAndBecomeFlexible(command.passwordHash);
    await this.userContract.persist(user);
    user.commit();

    return ok(undefined);
  }
}
