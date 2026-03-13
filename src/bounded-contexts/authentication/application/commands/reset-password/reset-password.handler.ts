import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResetPasswordCommand } from '@authentication/application/commands/reset-password/reset-password.command';
import { ResetPasswordCommandResult } from '@authentication/application/types/authentication-result.types';
import { ResetPasswordSaga } from '@authentication/application/sagas/reset-password/reset-password.saga';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  constructor(private readonly saga: ResetPasswordSaga) {}

  execute(command: ResetPasswordCommand): Promise<ResetPasswordCommandResult> {
    return this.saga.execute({ token: command.token, newPassword: command.newPassword });
  }
}
