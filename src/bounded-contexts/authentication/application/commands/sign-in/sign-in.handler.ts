import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SignInCommand } from '@authentication/application/commands/sign-in/sign-in.command';
import { SignInCommandResult } from '@authentication/application/types/authentication-result.types';
import { SignInSaga } from '@authentication/application/sagas/sign-in/sign-in.saga';

@CommandHandler(SignInCommand)
export class SignInHandler implements ICommandHandler<SignInCommand> {
  constructor(private readonly saga: SignInSaga) {}

  execute(command: SignInCommand): Promise<SignInCommandResult> {
    return this.saga.execute({
      emailOrUsername: command.emailOrUsername,
      password: command.password,
    });
  }
}
