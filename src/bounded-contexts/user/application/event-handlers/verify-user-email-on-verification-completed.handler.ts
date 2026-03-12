import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger, Inject } from '@nestjs/common';
import { EmailVerificationCompletedEvent } from '@authentication/domain/events/email-verification-completed.event';
import { IUserContract } from '@user/domain/contracts/user.contract';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

/**
 * User BC handler for EmailVerificationCompletedEvent (cross-BC).
 * When Auth BC completes email verification, this handler marks the
 * user's email as verified in the User aggregate.
 */
@EventsHandler(EmailVerificationCompletedEvent)
export class VerifyUserEmailOnVerificationCompletedHandler implements IEventHandler<EmailVerificationCompletedEvent> {
  private readonly logger = new Logger(VerifyUserEmailOnVerificationCompletedHandler.name);

  constructor(
    @Inject(INJECTION_TOKENS.USER_CONTRACT)
    private readonly userContract: IUserContract,
  ) {}

  async handle(event: EmailVerificationCompletedEvent): Promise<void> {
    const user = await this.userContract.findByUUID(event.userUUID);
    if (!user) {
      this.logger.warn(`User not found for email verification: uuid=${event.userUUID}`);
      return;
    }

    user.verifyEmail();
    await this.userContract.persist(user);

    this.logger.log(`User email verified via event: uuid=${event.userUUID}`);
  }
}
