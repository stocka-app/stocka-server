import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { VerificationCodeResentEvent } from '@/auth/domain/events/verification-code-resent.event';

@EventsHandler(VerificationCodeResentEvent)
export class VerificationCodeResentEventHandler implements IEventHandler<VerificationCodeResentEvent> {
  private readonly logger = new Logger(VerificationCodeResentEventHandler.name);

  handle(event: VerificationCodeResentEvent): void {
    this.logger.log(
      `Verification code resent: userId=${event.userId}, email=${event.email}, resendCount=${event.resendCount}`,
    );
  }
}
