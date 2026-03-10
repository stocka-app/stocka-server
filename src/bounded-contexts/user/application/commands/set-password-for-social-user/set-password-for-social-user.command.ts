import { Result } from '@shared/domain/result';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';

export class SetPasswordForSocialUserCommand {
  constructor(
    public readonly userId: number,
    public readonly passwordHash: string,
  ) {}
}

export type SetPasswordForSocialUserCommandResult = Result<void, UserNotFoundException>;
