import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshSessionCommand } from '@authentication/application/commands/refresh-session/refresh-session.command';
import { RefreshSessionCommandResult } from '@authentication/application/types/authentication-result.types';
import { RefreshSessionSaga } from '@authentication/application/sagas/refresh-session/refresh-session.saga';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  constructor(private readonly saga: RefreshSessionSaga) {}

  execute(command: RefreshSessionCommand): Promise<RefreshSessionCommandResult> {
    return this.saga.execute({ refreshToken: command.refreshToken });
  }
}
