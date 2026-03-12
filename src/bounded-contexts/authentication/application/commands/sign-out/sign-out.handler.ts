import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SignOutCommand } from '@authentication/application/commands/sign-out/sign-out.command';
import { AuthenticationDomainService } from '@authentication/domain/services/authentication-domain.service';
import { ISessionContract } from '@authentication/domain/contracts/session.contract';
import { UserSignedOutEvent } from '@authentication/domain/events/user-signed-out.event';
import { SessionArchivedEvent } from '@authentication/domain/events/session-archived.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';

@CommandHandler(SignOutCommand)
export class SignOutHandler implements ICommandHandler<SignOutCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: SignOutCommand): Promise<void> {
    const tokenHash = AuthenticationDomainService.hashToken(command.refreshToken);
    const session = await this.sessionContract.findByTokenHash(tokenHash);

    if (session) {
      const user = await this.mediator.user.findById(session.userId);

      await this.sessionContract.archiveAllByUserId(session.userId);

      if (user) {
        this.eventBus.publish(new SessionArchivedEvent(session.uuid));
        this.eventBus.publish(new UserSignedOutEvent(user.uuid));
      }
    }
  }
}
