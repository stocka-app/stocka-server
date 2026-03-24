import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SocialSignInCommand } from '@authentication/application/commands/social-sign-in/social-sign-in.command';
import { SocialSignInResult } from '@authentication/application/types/authentication-result.types';
import { SocialSignInSaga } from '@authentication/application/sagas/social-sign-in/social-sign-in.saga';

@CommandHandler(SocialSignInCommand)
export class SocialSignInHandler implements ICommandHandler<SocialSignInCommand> {
  constructor(private readonly saga: SocialSignInSaga) {}

  async execute(command: SocialSignInCommand): Promise<SocialSignInResult> {
    const result = await this.saga.execute({
      email: command.email,
      displayName: command.displayName,
      provider: command.provider,
      providerId: command.providerId,
      givenName: command.givenName,
      familyName: command.familyName,
      avatarUrl: command.avatarUrl,
      locale: command.locale,
      emailVerified: command.emailVerified,
      jobTitle: command.jobTitle,
      rawData: command.rawData,
    });

    if (result.isErr()) throw result.error;

    const { user, credential, accessToken, refreshToken } = result.value;
    return { user, credential, accessToken, refreshToken };
  }
}
