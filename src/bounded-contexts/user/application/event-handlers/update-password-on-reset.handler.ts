import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { UserPasswordResetByAuthEvent } from '@shared/domain/events/integration/user-password-reset-by-auth.event';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * User BC handler for UserPasswordResetByAuthEvent (cross-BC).
 * When Auth BC completes a password reset, this handler updates
 * the user's password hash in the User aggregate.
 */
@EventsHandler(UserPasswordResetByAuthEvent)
export class UpdatePasswordOnResetHandler implements IEventHandler<UserPasswordResetByAuthEvent> {
  private readonly logger = new Logger(UpdatePasswordOnResetHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async handle(event: UserPasswordResetByAuthEvent): Promise<void> {
    const user = await this.userContract.findById(event.userId);
    if (!user) {
      this.logger.warn(`User not found for password reset: userId=${event.userId}`);
      return;
    }

    user.updatePasswordHash(event.newPasswordHash);
    await this.userContract.persist(user);

    this.logger.log(`User password updated via reset event: userId=${event.userId}`);
  }
}
