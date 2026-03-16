import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserVerificationBlockedByAuthenticationEvent } from '@shared/domain/events/integration/user-verification-blocked-by-authentication.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

/**
 * User BC handler for UserVerificationBlockedByAuthenticationEvent (cross-BC).
 * When Auth BC rate-limiting blocks a user's verification attempts,
 * this handler applies the block on the CredentialAccount via the user facade.
 */
@EventsHandler(UserVerificationBlockedByAuthenticationEvent)
export class BlockVerificationOnRateLimitHandler implements IEventHandler<UserVerificationBlockedByAuthenticationEvent> {
  private readonly logger = new Logger(BlockVerificationOnRateLimitHandler.name);

  constructor(private readonly mediator: MediatorService) {}

  async handle(event: UserVerificationBlockedByAuthenticationEvent): Promise<void> {
    const result = await this.mediator.user.findUserByUUIDWithCredential(event.userUUID);
    if (!result) {
      this.logger.warn(`User not found for verification block: uuid=${event.userUUID}`);
      return;
    }

    try {
      await this.mediator.user.blockVerification(result.credential.id!, event.blockedUntil);
      this.logger.log(`Verification blocked via event: uuid=${event.userUUID}`);
    } catch (error) {
      this.logger.warn(
        `Failed to block verification via event: uuid=${event.userUUID}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
