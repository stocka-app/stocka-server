import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { SignOutCommand } from '@auth/application/commands/sign-out/sign-out.command';
import { AuthDomainService } from '@auth/domain/services/auth-domain.service';
import { ISessionContract } from '@auth/domain/contracts/session.contract';
import { UserSignedOutEvent } from '@auth/domain/events/user-signed-out.event';
import { SessionArchivedEvent } from '@auth/domain/events/session-archived.event';
import { MediatorService } from '@shared/infrastructure/mediator/mediator.service';
import { INJECTION_TOKENS } from '@common/constants/app.constants';
import { UserAggregate } from '@user/domain/models/user.aggregate';

@CommandHandler(SignOutCommand)
export class SignOutHandler implements ICommandHandler<SignOutCommand> {
  constructor(
    private readonly mediator: MediatorService,
    private readonly eventBus: EventBus,
    @Inject(INJECTION_TOKENS.SESSION_CONTRACT)
    private readonly sessionContract: ISessionContract,
  ) {}

  async execute(command: SignOutCommand): Promise<void> {
    const tokenHash = AuthDomainService.hashToken(command.refreshToken);
    const session = await this.sessionContract.findByTokenHash(tokenHash);

    if (session) {
      const user = (await this.mediator.findUserById(session.userId)) as UserAggregate | null;

      await this.sessionContract.archiveAllByUserId(session.userId);

      if (user) {
        this.eventBus.publish(new SessionArchivedEvent(session.uuid));
        this.eventBus.publish(new UserSignedOutEvent(user.uuid));
      }
    }
  }
}
