import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SignUpCommand } from '@authentication/application/commands/sign-up/sign-up.command';
import { SignUpCommandResult } from '@authentication/application/types/authentication-result.types';
import { SignUpSaga } from '@authentication/application/sagas/sign-up/sign-up.saga';

@CommandHandler(SignUpCommand)
export class SignUpHandler implements ICommandHandler<SignUpCommand> {
  constructor(private readonly signUpSaga: SignUpSaga) {}

  async execute(command: SignUpCommand): Promise<SignUpCommandResult> {
    const result = await this.signUpSaga.execute({
      email: command.email,
      username: command.username,
      password: command.password,
      lang: command.lang,
    });

    return result.map((output) => ({
      user: output.user,
      credential: output.credential,
      accessToken: output.accessToken,
      refreshToken: output.refreshToken,
      emailVerificationRequired: true,
      emailSent: output.emailSent,
    }));
  }
}
