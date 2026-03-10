import { Result } from '@shared/domain/result';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { UserAggregate } from '@user/domain/models/user.aggregate';

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly username: string,
    public readonly passwordHash: string,
  ) {}
}

export type CreateUserCommandResult = Result<UserAggregate, DomainException>;
