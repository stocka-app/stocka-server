import { Result } from '@shared/domain/result';
import { UserNotFoundException } from '@user/domain/exceptions/user-not-found.exception';

export class LinkProviderToUserCommand {
  constructor(
    public readonly userId: number,
    public readonly provider: string,
    public readonly providerId: string,
  ) {}
}

export type LinkProviderToUserCommandResult = Result<void, UserNotFoundException>;
