import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { IUserContract } from '@user/domain/contracts/user.contract';
import {
  SetPasswordForSocialUserCommand,
  SetPasswordForSocialUserCommandResult,
} from '@user/application/commands/set-password-for-social-user/set-password-for-social-user.command';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { ok, err } from '@shared/domain/result';

/**
 * @deprecated Use UserFacade.updatePasswordHash() instead.
 * This handler remains for CQRS compatibility but password updates are
 * now handled via the CredentialAccount model through the UserFacade.
 */
@CommandHandler(SetPasswordForSocialUserCommand)
export class SetPasswordForSocialUserHandler implements ICommandHandler<SetPasswordForSocialUserCommand> {
  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
    private readonly mediator: MediatorService,
  ) {}

  async execute(
    command: SetPasswordForSocialUserCommand,
  ): Promise<SetPasswordForSocialUserCommandResult> {
    const user = await this.userContract.findById(command.userId);
    if (!user) return err(new UserNotFoundException(String(command.userId)));

    // Resolve credential via user facade and update password hash
    const result = await this.mediator.user.findUserByUUIDWithCredential(user.uuid);
    if (!result) return err(new UserNotFoundException(String(command.userId)));

    await this.mediator.user.updatePasswordHash(result.credential.id!, command.passwordHash);

    return ok(undefined);
  }
}
