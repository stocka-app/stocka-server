import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserPasswordResetByAuthenticationEvent } from '@shared/domain/events/integration/user-password-reset-by-authentication.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';

/**
 * User BC handler for UserPasswordResetByAuthenticationEvent (cross-BC).
 * When Auth BC completes a password reset, this handler updates
 * the credential's password hash via the user facade.
 */
@EventsHandler(UserPasswordResetByAuthenticationEvent)
export class UpdatePasswordOnResetHandler implements IEventHandler<UserPasswordResetByAuthenticationEvent> {
  private readonly logger = new Logger(UpdatePasswordOnResetHandler.name);

  constructor(private readonly mediator: MediatorService) {}

  async handle(event: UserPasswordResetByAuthenticationEvent): Promise<void> {
    try {
      await this.mediator.user.updatePasswordHash(event.credentialAccountId, event.newPasswordHash);
      this.logger.log(
        `Password updated via reset event: credentialAccountId=${event.credentialAccountId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to update password via reset event: credentialAccountId=${event.credentialAccountId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
