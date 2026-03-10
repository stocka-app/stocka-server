import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { ISocialAccountContract } from '@user/domain/contracts/social-account.contract';
import { AccountType } from '@user/domain/models/user.aggregate';
import {
  LinkProviderToUserCommand,
  LinkProviderToUserCommandResult,
} from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

@CommandHandler(LinkProviderToUserCommand)
export class LinkProviderToUserHandler implements ICommandHandler<LinkProviderToUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    @Inject(INJECTION_TOKENS.SOCIAL_ACCOUNT_CONTRACT)
    private readonly socialAccountContract: ISocialAccountContract,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: LinkProviderToUserCommand): Promise<LinkProviderToUserCommandResult> {
    const user = await this.userContract.findById(command.userId);
    if (!user) return err(new UserNotFoundException(String(command.userId)));

    await this.socialAccountContract.persist({
      userId: command.userId,
      provider: command.provider,
      providerId: command.providerId,
    });

    const isManualAccountWithPassword =
      user.accountType === AccountType.MANUAL && user.hasPassword();
    if (isManualAccountWithPassword) {
      const isFlexiblePending = user.status.isPendingVerification();
      this.eventPublisher.mergeObjectContext(user);
      user.becomeFlexible(command.provider, isFlexiblePending);
      await this.userContract.persist(user);
      user.commit();
    }

    return ok(undefined);
  }
}
