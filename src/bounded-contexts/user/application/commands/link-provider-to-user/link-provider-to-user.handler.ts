import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { Inject } from '@nestjs/common';
import {
  LinkProviderToUserCommand,
  LinkProviderToUserCommandResult,
} from '@user/application/commands/link-provider-to-user/link-provider-to-user.command';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

/**
 * @deprecated Use UserFacade.linkSocialAccount() instead.
 * This handler remains for CQRS compatibility but provider linking is
 * now handled transactionally by the UserFacade.
 */
@CommandHandler(LinkProviderToUserCommand)
export class LinkProviderToUserHandler implements ICommandHandler<LinkProviderToUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly mediator: MediatorService,
  ) {}

  async execute(command: LinkProviderToUserCommand): Promise<LinkProviderToUserCommandResult> {
    const user = await this.userContract.findById(command.userId);
    if (!user) return err(new UserNotFoundException(String(command.userId)));

    await this.mediator.user.linkSocialAccount(command.userId, {
      provider: command.provider,
      providerId: command.providerId,
    });

    return ok(undefined);
  }
}
