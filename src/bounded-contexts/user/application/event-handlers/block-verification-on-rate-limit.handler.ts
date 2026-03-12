import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * User BC handler for UserVerificationBlockedByAuthenticationEvent (cross-BC).
 * When Auth BC rate-limiting blocks a user's verification attempts,
 * this handler applies the block on the User aggregate.
 */
@EventsHandler(UserVerificationBlockedByAuthenticationEvent)
export class BlockVerificationOnRateLimitHandler implements IEventHandler<UserVerificationBlockedByAuthenticationEvent> {
  private readonly logger = new Logger(BlockVerificationOnRateLimitHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async handle(event: UserVerificationBlockedByAuthenticationEvent): Promise<void> {
    const user = await this.userContract.findByUUID(event.userUUID);
    if (!user) {
      this.logger.warn(`User not found for verification block: uuid=${event.userUUID}`);
      return;
    }

    user.blockVerification(event.blockedUntil);
    await this.userContract.persist(user);

    this.logger.log(`User verification blocked via event: uuid=${event.userUUID}`);
  }
}
